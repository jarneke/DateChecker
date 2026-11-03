BEGIN;

CREATE TABLE public.datecheck_deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (
        char_length(trim(name)) BETWEEN 1 AND 120
    ),
    active boolean NOT NULL DEFAULT TRUE,
    version integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamptz
);

CREATE UNIQUE INDEX datecheck_deliveries_name_unique
ON public.datecheck_deliveries (lower(trim(name)))
WHERE deleted_at IS NULL;

CREATE TABLE public.datecheck_delivery_weekdays (
    delivery_id uuid NOT NULL
        REFERENCES public.datecheck_deliveries(id)
        ON DELETE CASCADE,
    weekday integer NOT NULL CHECK (weekday BETWEEN 1 AND 7),
    PRIMARY KEY (delivery_id, weekday)
);

CREATE TABLE public.datecheck_delivery_categories (
    delivery_id uuid NOT NULL
        REFERENCES public.datecheck_deliveries(id)
        ON DELETE CASCADE,
    category_id uuid NOT NULL
        REFERENCES public.categories(id)
        ON DELETE RESTRICT,
    PRIMARY KEY (delivery_id, category_id)
);

CREATE INDEX datecheck_delivery_categories_category_idx
ON public.datecheck_delivery_categories (category_id);

CREATE FUNCTION public.datecheck_save_delivery(
    p_id uuid,
    p_name text,
    p_active boolean,
    p_weekdays integer[],
    p_category_ids uuid[],
    p_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    v_id uuid := p_id;
    v_name text := trim(p_name);
    v_weekdays integer[];
    v_category_ids uuid[];
    v_version integer;
BEGIN
    IF v_name IS NULL
       OR char_length(v_name) NOT BETWEEN 1 AND 120
    THEN
        RAISE EXCEPTION
            'Vul een leveringsnaam in van maximaal 120 tekens.';
    END IF;

    IF p_active IS NULL THEN
        RAISE EXCEPTION 'Ongeldige leveringsstatus.';
    END IF;

    IF COALESCE(cardinality(p_weekdays), 0) = 0
       OR EXISTS (
           SELECT 1
           FROM unnest(p_weekdays) AS days(weekday)
           WHERE weekday IS NULL
              OR weekday NOT BETWEEN 1 AND 7
       )
    THEN
        RAISE EXCEPTION 'Kies minstens één geldige weekdag.';
    END IF;

    SELECT array_agg(DISTINCT weekday ORDER BY weekday)
    INTO v_weekdays
    FROM unnest(p_weekdays) AS days(weekday);

    IF COALESCE(cardinality(p_category_ids), 0) = 0
       OR EXISTS (
           SELECT 1
           FROM unnest(p_category_ids) AS selected(category_id)
           WHERE category_id IS NULL
       )
    THEN
        RAISE EXCEPTION 'Kies minstens één categorie.';
    END IF;

    SELECT array_agg(DISTINCT category_id ORDER BY category_id)
    INTO v_category_ids
    FROM unnest(p_category_ids) AS selected(category_id);

    PERFORM id
    FROM public.categories
    WHERE id = ANY(v_category_ids)
    ORDER BY id
    FOR KEY SHARE;

    IF (
        SELECT COUNT(*)
        FROM public.categories
        WHERE id = ANY(v_category_ids)
    ) <> cardinality(v_category_ids) THEN
        RAISE EXCEPTION
            'Een gekozen categorie bestaat niet meer. Vernieuw de instellingen.';
    END IF;

    IF v_id IS NULL THEN
        INSERT INTO public.datecheck_deliveries (name, active)
        VALUES (v_name, p_active)
        RETURNING id, version INTO v_id, v_version;
    ELSE
        SELECT version
        INTO v_version
        FROM public.datecheck_deliveries
        WHERE id = v_id
          AND deleted_at IS NULL
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Deze levering bestaat niet meer.';
        END IF;

        IF v_version IS DISTINCT FROM p_version THEN
            RAISE EXCEPTION
                'Deze levering is intussen gewijzigd. Vernieuw de lijst.';
        END IF;

        UPDATE public.datecheck_deliveries
        SET
            name = v_name,
            active = p_active,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_id
        RETURNING version INTO v_version;
    END IF;

    DELETE FROM public.datecheck_delivery_weekdays
    WHERE delivery_id = v_id;

    INSERT INTO public.datecheck_delivery_weekdays (
        delivery_id,
        weekday
    )
    SELECT v_id, weekday
    FROM unnest(v_weekdays) AS days(weekday);

    DELETE FROM public.datecheck_delivery_categories
    WHERE delivery_id = v_id;

    INSERT INTO public.datecheck_delivery_categories (
        delivery_id,
        category_id
    )
    SELECT v_id, category_id
    FROM unnest(v_category_ids) AS selected(category_id);

    RETURN jsonb_build_object(
        'id', v_id,
        'name', v_name,
        'active', p_active,
        'version', v_version,
        'weekdays', to_jsonb(v_weekdays),
        'categoryIds', to_jsonb(v_category_ids)
    );
END;
$function$;

CREATE FUNCTION public.datecheck_delete_delivery(
    p_id uuid,
    p_version integer
)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
    v_version integer;
BEGIN
    SELECT version
    INTO v_version
    FROM public.datecheck_deliveries
    WHERE id = p_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deze levering bestaat niet meer.';
    END IF;

    IF v_version IS DISTINCT FROM p_version THEN
        RAISE EXCEPTION
            'Deze levering is intussen gewijzigd. Vernieuw de lijst.';
    END IF;

    UPDATE public.datecheck_deliveries
    SET
        active = FALSE,
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        version = version + 1
    WHERE id = p_id;

    DELETE FROM public.datecheck_delivery_weekdays
    WHERE delivery_id = p_id;

    DELETE FROM public.datecheck_delivery_categories
    WHERE delivery_id = p_id;

    RETURN p_id;
END;
$function$;

COMMIT;