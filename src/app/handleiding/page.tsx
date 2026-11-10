import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  Package,
  Settings2,
  Truck,
} from "lucide-react";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Hoe werkt DateCheck?",
  description:
    "Stappenplannen voor de controles, leveringen, voorraad en instellingen van DateCheck.",
};

type InstructionImage = {
  src: string;
  alt: string;
  caption: string;
};

type CheckGuide = {
  id: string;
  title: string;
  badge: string;
  tone: "pink" | "orange" | "neutral";
  selection: string;
  steps: string[];
  note: string;
  href: string;
  image?: InstructionImage;
};

const CONTENTS = [
  { href: "#dagoverzicht", label: "Je dagelijkse ronde" },
  { href: "#datums", label: "Datums en stickers" },
  { href: "#controles", label: "Alle controles" },
  { href: "#leveringen", label: "Leveringen nakijken" },
  { href: "#voorraad", label: "Voorraad bijhouden" },
  { href: "#toevoegen", label: "Producten toevoegen" },
  { href: "#instellingen", label: "Instellingen onderhouden" },
  { href: "#vragen", label: "Veelgestelde vragen" },
];

const CHECKS: CheckGuide[] = [
  {
    id: "dagelijks-stickeren",
    title: "Dagelijks stickeren",
    badge: "30% · ochtend",
    tone: "pink",
    selection:
      "Producten voor dagelijks stickeren waarvan de opgeslagen vervaldatum vandaag is.",
    steps: [
      "Zoek het product en controleer welke exemplaren vandaag vervallen.",
      "Geef de aanwezige exemplaren voor vandaag een 30%-sticker. Kies daarna Gestickerd. Zijn er geen exemplaren met die datum? Kies Niet aanwezig.",
      "Controleer vervolgens of er ook voorraad is die na vandaag vervalt.",
      "Kies Vervaldatum invullen. Vul de vroegste datum van die latere voorraad in en bevestig met Nieuwe datum opslaan.",
      "Is er geen latere voorraad? Kies Geen voorraad. De opgeslagen voorraaddatum wordt dan leeggemaakt.",
    ],
    note: "Geen voorraad bij deze tweede vraag gaat alleen over de latere voorraad. De gestickerde exemplaren voor vandaag blijven apart onthouden voor Dagelijks ophalen.",
    href: "/check?type=sticker",
    image: {
      src: "/images/guide/daily-stock.png",
      alt: "Twee yoghurtpotten met datum 12/06 en roze 30%-stickers staan apart van drie ongestickerde potten met datum 15/06.",
      caption:
        "Voorbeeld: als het 12 juni is, sticker je de exemplaren voor 12/06. De eerstvolgende datum van de overige voorraad is 15/06.",
    },
  },
  {
    id: "vooruit-stickeren",
    title: "Vooruit stickeren",
    badge: "50% · vooruit",
    tone: "orange",
    selection:
      "Producten voor vooruit stickeren die vandaag tot en met het ingestelde aantal dagen vooruit vervallen.",
    steps: [
      "Zoek de voorraad met de vervaldatum die de app toont.",
      "Beoordeel of een 50%-sticker nodig is. Houd rekening met de hoeveelheid, de verkoop en de afspraken in de winkel.",
      "Heb je exemplaren gestickerd? Kies Gestickerd.",
      "Heb je geen nieuwe stickers aangebracht? Kies Niet gestickerd. Dat kan ook wanneer er wel voorraad is, maar korting niet nodig lijkt.",
      "Klopt de opgeslagen datum niet? Open het productmenu, kies Product bewerken en corrigeer de vroegste datum.",
    ],
    note: "Niet gestickerd wist een eerdere stickerregistratie niet. Als er al oranje stickers aanwezig zijn, controleer je of er nog bijkomende exemplaren gestickerd moeten worden.",
    href: "/check?type=monthly",
  },
  {
    id: "dagelijks-ophalen",
    title: "Dagelijks ophalen",
    badge: "30% · ophalen",
    tone: "pink",
    selection:
      "Alle producten voor dagelijks stickeren die als gestickerd geregistreerd staan, onafhankelijk van hun opgeslagen voorraaddatum.",
    steps: [
      "Zoek het product en verwijder de resterende exemplaren met een 30%-sticker.",
      "Kies Opgehaald of verkocht zodra alle gestickerde exemplaren uit het rayon zijn.",
      "De stickerstatus wordt uitgezet. De opgeslagen datum van de overige voorraad blijft behouden.",
    ],
    note: "De opgeslagen voorraaddatum kan ondertussen op een latere dag staan of leeg zijn. Dat verandert niets aan de noodzaak om de resterende gestickerde exemplaren op te halen.",
    href: "/check?type=evening",
  },
  {
    id: "vooruit-ophalen",
    title: "Vooruit gestickerde producten ophalen",
    badge: "50% · twee rondes",
    tone: "orange",
    selection:
      "Vooruit gestickerde producten waarvan de opgeslagen vervaldatum vandaag is.",
    steps: [
      "Ronde 1: verwijder bij ieder product de resterende gestickerde exemplaren met de getoonde datum.",
      "Kies per product Opgehaald of verkocht zodra alle gestickerde exemplaren uit het rayon zijn.",
      "Werk eerst de volledige ophaalronde af. De app vraagt tijdens deze ronde nog niet per product naar de overige voorraad.",
      "Ronde 2: controleer vervolgens voor ieder product of er voorraad overblijft die na vandaag vervalt.",
      "Kies Vervaldatum invullen en sla de vroegste datum op, of kies Geen voorraad wanneer er niets overblijft.",
    ],
    note: "Een product is pas volledig afgewerkt nadat ook de voorraadvraag beantwoord is. De aanduiding Voorraad bijgewerkt loopt daarom vooral tijdens de tweede ronde op.",
    href: "/check?type=monthly-pickup",
    image: {
      src: "/images/guide/two-round-pickup.png",
      alt: "Links zijn pakken met oranje 50%-stickers verzameld voor ophalen. Rechts staan dezelfde producten zonder korting met latere datums 15/06 en 18/06.",
      caption:
        "Eerst alle gestickerde exemplaren ophalen. Daarna de resterende voorraad controleren en de vroegste nieuwe datum bewaren.",
    },
  },
  {
    id: "over-datum",
    title: "Over datum",
    badge: "Verlopen voorraad",
    tone: "neutral",
    selection: "Producten met een opgeslagen vervaldatum vóór vandaag.",
    steps: [
      "Zoek het product en verwijder de verlopen exemplaren.",
      "Controleer of er nog verkoopbare voorraad overblijft.",
      "Kies Vervaldatum invullen en bewaar de vroegste vervaldatum van de resterende voorraad.",
      "Is er niets meer over? Kies Geen voorraad.",
    ],
    note: "Deze controle vangt ook producten op waarvan de vervaldatum verstreken is voordat een eerdere ronde afgewerkt werd.",
    href: "/check?type=overdue",
  },
  {
    id: "stockcheck",
    title: "Stockcheck",
    badge: "Voorraad aanvullen",
    tone: "neutral",
    selection:
      "Producten zonder opgeslagen vervaldatum, binnen de gekozen categorie of categorieën.",
    steps: [
      "Open Stockcheck en kies een categorie of Alle categorieën.",
      "Zoek het product en controleer of het opnieuw in voorraad is.",
      "Kies Vervaldatum invullen. Vul de vroegste vervaldatum in en bevestig met Nieuwe datum opslaan.",
      "Is er nog geen voorraad? Kies Geen voorraad. De datum blijft leeg, maar het product telt wel als gecontroleerd voor deze ronde.",
    ],
    note: "De gewone stockcheck en de leveringscheck bewaren hun voortgang afzonderlijk. Een eerdere gewone stockcheck vervangt dus niet automatisch een nieuwe leveringscheck.",
    href: "/check?type=stock",
  },
];

const QUESTIONS = [
  {
    question: "Waarom staat een product niet in een controle?",
    answer:
      "Controleer de opgeslagen datum, de stickersoort en de instelling Controles pauzeren. Een product verschijnt alleen wanneer zijn actuele gegevens bij die controle passen. Een al beantwoord product kan voor de huidige ronde ook al afgewerkt zijn. Controleer bij een leveringscheck ook je gekozen leveringen en categorieën.",
  },
  {
    question: "Hoe kan een product gestickerd zijn en toch geen datum hebben?",
    answer:
      "Bij dagelijks stickeren kan dat kloppen. De exemplaren voor vandaag zijn gestickerd, maar er is geen latere voorraad. De datum is dan leeg terwijl de stickerstatus aanblijft. Het product blijft bij Dagelijks ophalen verschijnen. Bij vooruit stickeren heeft een gestickerd product wel een datum nodig.",
  },
  {
    question: "Waarom blijft de stickerstatus aan na Niet gestickerd?",
    answer:
      "Dat antwoord betekent dat je bij deze controle geen nieuwe stickers hebt aangebracht. Het wist niet de registratie van exemplaren die eerder al gestickerd werden. Die moeten nog via de juiste ophaalronde afgehandeld worden.",
  },
  {
    question: "Een nieuwe levering heeft een vroegere datum. Wat moet ik doen?",
    answer:
      "Open het bestaande product in Voorraad en pas de datum aan naar de vroegste relevante datum die werkelijk aanwezig is. Een stockcheck toont alleen producten zonder opgeslagen datum. Een nieuwe, vroegere partij bij een product dat al een datum heeft, moet je dus zelf corrigeren.",
  },
  {
    question: "Moet ik een product verwijderen wanneer het uitverkocht is?",
    answer:
      "Nee. Maak de voorraaddatum leeg of kies Geen voorraad tijdens de passende controle. Het product blijft bestaan en kan bij een latere stockcheck opnieuw aangevuld worden. Gebruik Product verwijderen alleen wanneer het product echt uit DateCheck moet verdwijnen.",
  },
  {
    question: "Waarom komt een afgewerkt product later opnieuw terug?",
    answer:
      "Een nieuwe dag of een relevante wijziging aan het product kan een nieuwe controle nodig maken. Bijvoorbeeld wanneer de datum wordt aangepast of de stickerstatus verandert. De app bepaalt de openstaande controles opnieuw op basis van de actuele gegevens.",
  },
  {
    question: "Kan ik op een ander toestel verderwerken?",
    answer:
      "Bevestigde controleantwoorden worden centraal opgeslagen. Open de controle op het andere toestel en laat de gegevens laden. Kies bij een leveringscheck de betreffende leveringen en categorieën opnieuw. Een datum die je alleen hebt geselecteerd maar nog niet opgeslagen hebt, is nog niet verwerkt.",
  },
  {
    question: "Waarom kan ik een vorig antwoord niet herstellen?",
    answer:
      "Een herstel kan geweigerd worden als het product of de controle ondertussen gewijzigd is. Zo overschrijft een oud scherm geen nieuwere gegevens. Bij een leveringscheck moet het vorige antwoord ook binnen de huidige categorieselectie vallen. Herlaad de controle en controleer de huidige toestand. Gebruik Product bewerken voor een bewuste correctie.",
  },
  {
    question: "Waarom zie ik geen leveringsherinnering meer?",
    answer:
      "De suggestie verschijnt op de leveringsdag en, als de check nog openstaat, op de dag erna. Na die herinneringsdag verdwijnt ze uit dit korte overzicht. Dat is op zichzelf geen bevestiging dat de levering gecontroleerd werd.",
  },
  {
    question: "De levering kwam pas na mijn eerste controle aan. Wat nu?",
    answer:
      "Open de leveringsselectie via Stockcheck en kies Opnieuw controleren. Vink de afgeronde leveringen en de gewenste categorieën aan. Dit start een nieuwe ronde voor de gekozen leveringen; eerdere antwoorden blijven in de historie. Producten die al een datum hebben, corrigeer je rechtstreeks in Voorraad wanneer de nieuwe levering een vroegere datum heeft.",
  },
  {
    question:
      "Is de hele levering klaar als mijn gekozen categorieën klaar zijn?",
    answer:
      "Alleen wanneer er voor die levering geen andere producten meer openstaan. Niet-gekozen categorieën met resterende producten blijven beschikbaar. Kies Andere categorieën kiezen om die later te controleren.",
  },
  {
    question: "Waarom staat mijn nieuwe product nog niet in Voorraad?",
    answer:
      "Toevoegen aan lijst bewaart het product eerst lokaal. Het komt pas in de gedeelde voorraad nadat je Alles uploaden naar DateCheck hebt uitgevoerd en de upload bevestigd is. Controleer ook of een bestaande productnaam overgeslagen werd.",
  },
  {
    question: "Wat doe ik bij een laad- of opslagfout?",
    answer:
      "Lees de melding en controleer je verbinding. Herlaad daarna de gegevens voordat je opnieuw antwoordt. Controleer bij twijfel eerst of de vorige handeling al verwerkt is. Een foutmelding of ontbrekend aantal betekent niet dat alle controles afgewerkt zijn.",
  },
];

function Illustration({ src, alt, caption }: InstructionImage) {
  return (
    <figure className={styles.figure}>
      <Image
        src={src}
        alt={alt}
        width={1536}
        height={1024}
        className={styles.image}
        loading="lazy"
        unoptimized
      />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export default function GuidePage() {
  return (
    <main id="bovenaan" className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerIcon}>
            <BookOpen size={27} aria-hidden="true" />
          </div>
          <span className={styles.eyebrow}>HANDLEIDING</span>
          <p>
            Houd de vroegste voorraaddatum bij, registreer gestickerde
            exemplaren en werk de passende controles af.
          </p>
          <p className={styles.small}>
            Voer de rondes uit op de momenten die in de winkel afgesproken zijn.
          </p>
        </header>

        <nav className={styles.contents} aria-label="Inhoud van de handleiding">
          {CONTENTS.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          ))}
        </nav>

        <section id="dagoverzicht" className={styles.section}>
          <div className={styles.sectionHeading}>
            <ClipboardCheck size={21} aria-hidden="true" />
            <h2>Je dagelijkse ronde</h2>
          </div>

          <div className={styles.quickStart}>
            <a href="#dagelijks-stickeren">
              <span className={styles.stepNumber}>01</span>
              <strong>Bij de stickercontrole</strong>
              <span>
                Werk dagelijks en vooruit stickeren af. Controleer de fysieke
                voorraad en beantwoord de vragen in de app.
              </span>
            </a>

            <a href="#leveringen">
              <span className={styles.stepNumber}>02</span>
              <strong>Na een levering</strong>
              <span>
                Kies de leveringen en categorieën die je wilt nakijken. Werk ook
                vroegere datums bij van producten die al een datum hadden.
              </span>
            </a>

            <a href="#dagelijks-ophalen">
              <span className={styles.stepNumber}>03</span>
              <strong>Bij het ophalen</strong>
              <span>
                Verwijder resterende gestickerde exemplaren en werk de
                bijbehorende voorraadvragen af.
              </span>
            </a>
          </div>

          <p>
            Bekijk ook de tegel Over datum wanneer daar producten openstaan.
            Gepauzeerde producten worden uit de controlerondes gehouden.
          </p>
        </section>

        <section id="datums" className={styles.section}>
          <h2>De basis: datums en stickers</h2>

          <p>
            DateCheck bewaart per product één voorraaddatum. Meestal is dat de
            vroegste vervaldatum die nog aanwezig is. Kijk dus naar alle
            aanwezige exemplaren, ook wanneer een recent gevonden partij eerder
            vervalt dan wat al opgeslagen was.
          </p>

          <Illustration
            src="/images/guide/earliest-date.png"
            alt="Drie gelijke pakken met datums 12/06, 15/06 en 19/06. Het pak met 12/06 staat vooraan en is groen aangeduid."
            caption="Van dezelfde voorraad met datums 12/06, 15/06 en 19/06 bewaar je de vroegste relevante datum: 12/06."
          />

          <dl className={styles.definitions}>
            <div>
              <dt>Voorraaddatum</dt>
              <dd>
                De vroegste datum die de app voor de voorraad moet opvolgen. Bij
                dagelijks stickeren werk je deze bij naar de eerstvolgende
                voorraad die na vandaag vervalt.
              </dd>
            </div>
            <div>
              <dt>Stickersoort</dt>
              <dd>
                Dagelijks stickeren gebruikt 30%-stickers. Vooruit stickeren
                gebruikt 50%-stickers.
              </dd>
            </div>
            <div>
              <dt>Gestickerd</dt>
              <dd>
                Er zijn gestickerde exemplaren geregistreerd die nog opgevolgd
                moeten worden. Deze status staat los van de datum van eventuele
                overige voorraad.
              </dd>
            </div>
            <div>
              <dt>Geen datum</dt>
              <dd>
                Er is geen voorraaddatum geregistreerd. Bij dagelijks stickeren
                kunnen er wel nog gestickerde exemplaren voor vandaag liggen,
                terwijl er geen latere voorraad is.
              </dd>
            </div>
          </dl>

          <div className={styles.legend}>
            <span>
              <i className={styles.pinkMarker} aria-hidden="true" />
              Roze: gestickerd met 30%
            </span>
            <span>
              <i className={styles.orangeMarker} aria-hidden="true" />
              Oranje: gestickerd met 50%
            </span>
          </div>

          <aside className={styles.note}>
            <strong>Één product kan verschillende partijen hebben.</strong>
            <p>
              De app houdt geen afzonderlijke datum per partij bij. Controleer
              bij een datumcorrectie daarom ook of de stickerstatus nog
              overeenkomt met de fysieke voorraad.
            </p>
          </aside>
        </section>

        <section id="controles" className={styles.section}>
          <h2>De controles, stap voor stap</h2>
          <p>
            De actuele productgegevens bepalen welke producten je te zien
            krijgt. Bevestigde antwoorden worden bewaard. Een datum wordt
            verwerkt nadat je Nieuwe datum opslaan kiest.
          </p>

          <div className={styles.checks}>
            {CHECKS.map((guide) => (
              <article key={guide.id} id={guide.id} className={styles.check}>
                <span
                  className={[
                    styles.badge,
                    guide.tone === "pink"
                      ? styles.pinkBadge
                      : guide.tone === "orange"
                        ? styles.orangeBadge
                        : styles.neutralBadge,
                  ].join(" ")}
                >
                  {guide.badge}
                </span>

                <h3>{guide.title}</h3>
                <p className={styles.selection}>
                  <strong>Welke producten?</strong> {guide.selection}
                </p>

                <ol className={styles.steps}>
                  {guide.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>

                <aside className={styles.note}>
                  <p>{guide.note}</p>
                </aside>

                {guide.image && <Illustration {...guide.image} />}

                <Link
                  href={guide.href}
                  className={styles.actionLink}
                  prefetch={false}
                >
                  Open deze controle
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section id="leveringen" className={styles.section}>
          <div className={styles.sectionHeading}>
            <Truck size={21} aria-hidden="true" />
            <h2>Leveringen nakijken</h2>
          </div>

          <p>
            Een levering heeft vaste weekdagen en gekoppelde categorieën. De app
            stelt de levering voor op de leveringsdag en herinnert er de
            volgende dag aan als de controle nog niet afgerond is.
          </p>

          <p>
            Op de startpagina verschijnt bij openstaande leveringen een knop
            Leveringscheck starten met een belletje. De leveringsnamen staan op
            het keuzescherm, zodat de startpagina overzichtelijk blijft. Je kunt
            de selectie ook via Stockcheck openen.
          </p>

          <Illustration
            src="/images/guide/deliveries.png"
            alt="Twee leveringsdozen met deels dezelfde producten en één gezamenlijke controlelijst op de voorgrond."
            caption="Kies één of meerdere leveringen en bepaal welke gekoppelde categorieën je controleert. Overlappende producten krijg je één keer in de gezamenlijke ronde."
          />

          <ol className={styles.steps}>
            <li>
              Kies Leveringscheck starten. Je opent eerst het keuzescherm; er
              begint nog geen controle.
            </li>
            <li>
              Vink de openstaande leveringen aan die je nu wilt nakijken. Een
              herinnering duidt een openstaande levering van gisteren aan.
            </li>
            <li>
              De gekoppelde categorieën worden voorgeselecteerd. Vink
              categorieën uit die je later wilt doen. Kies voor iedere
              aangevinkte levering minstens één categorie.
            </li>
            <li>
              Kies Controle starten. De app combineert de geselecteerde
              categorieën in één ronde en toont ieder product maar één keer.
            </li>
            <li>
              Controleer de producten zonder opgeslagen datum. Kies Vervaldatum
              invullen en sla de vroegste datum op, of kies Geen voorraad
              wanneer het product nog niet aanwezig is.
            </li>
            <li>
              Wanneer jouw selectie klaar is, zie je het eindscherm. Kies indien
              gevraagd Selectie afronden. Categorieën met nog openstaande
              producten blijven beschikbaar.
            </li>
          </ol>

          <aside className={styles.note}>
            <strong>Een bestaande datum wordt niet opnieuw gevraagd.</strong>
            <p>
              Heeft een geleverd product al een opgeslagen datum en blijkt de
              nieuwe partij eerder te vervallen? Pas dat product zelf aan in
              Voorraad.
            </p>
          </aside>

          <h3>Een levering in delen controleren</h3>
          <p>
            Je hoeft niet alle categorieën tegelijk te doen. Controleer
            bijvoorbeeld eerst de gekoelde producten en kies later de overige
            categorieën. Bevestigde antwoorden blijven bewaard.
          </p>
          <p>
            Gekozen categorieën gecontroleerd betekent dat jouw selectie klaar
            is. Een levering is pas volledig afgerond wanneer er voor die
            levering geen producten meer openstaan en de afronding verwerkt is.
            Een categorie zonder te controleren producten voegt geen vragen toe.
          </p>
          <p>
            Een antwoord telt alleen mee voor de geselecteerde leveringen
            waarvan de productcategorie deel uitmaakt. Een niet-geselecteerde
            levering wordt door jouw ronde niet automatisch afgevinkt.
          </p>

          <h3>Onderbreken en hervatten</h3>
          <p>
            Je bevestigde antwoorden blijven bewaard. Open het keuzescherm
            opnieuw en selecteer de betreffende leveringen en categorieën. De
            actuele productgegevens bepalen welke producten nog aan de beurt
            zijn.
          </p>
          <p>
            Een maandaglevering die je dinsdag afwerkt, blijft de controle van
            maandag. De suggestie verschijnt op de leveringsdag en, zolang de
            levering openstaat, op de dag erna.
          </p>
          <p>
            De gekoppelde categorieën van de levering worden bij de eerste start
            vastgelegd. Binnen die categorieën kies je wat je nu wilt
            controleren. Een latere wijziging aan de planning verandert een
            reeds gestarte levering niet.
          </p>

          <h3>Opnieuw controleren</h3>
          <p>
            Komt een levering pas na een eerdere controle aan? Open de
            leveringsselectie via Stockcheck en kies Opnieuw controleren. Vink
            de afgeronde leveringen en de gewenste categorieën aan en start de
            controle.
          </p>
          <p>
            Dit opent een nieuwe ronde voor de geselecteerde leveringen. De
            voortgang van hun vorige ronde telt niet meer als afgewerkt in de
            nieuwe ronde; de eerdere antwoorden blijven wel in de historie
            staan. Alleen producten zonder opgeslagen datum worden opnieuw
            gevraagd.
          </p>

          <Link
            href="/check/delivery/select"
            className={styles.actionLink}
            prefetch={false}
          >
            Leveringen en categorieën kiezen
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>

        <section id="voorraad" className={styles.section}>
          <div className={styles.sectionHeading}>
            <Package size={21} aria-hidden="true" />
            <h2>Voorraad correct bijhouden</h2>
          </div>

          <ol className={styles.steps}>
            <li>
              Open Voorraad en zoek het product op naam. Gebruik eventueel de
              categorie-, controle- of datumfilters.
            </li>
            <li>
              Open het product en controleer de naam, categorie, foto en
              vroegste voorraaddatum.
            </li>
            <li>
              Kijk bij Algemene instellingen naar de stickersoort, Gestickerd en
              Controles pauzeren.
            </li>
            <li>
              Kies Wijzigingen opslaan. De nieuwe gegevens werken door in de
              passende controles.
            </li>
          </ol>

          <h3>Als de voorraad op is</h3>
          <p>
            Maak de datum leeg. Verwijder het product niet alleen omdat het
            tijdelijk uitverkocht is. Bij een nieuwe levering kun je het via
            Stockcheck opnieuw aanvullen.
          </p>

          <h3>Als je een eerdere datum vindt</h3>
          <p>
            Bewaar de vroegste relevante datum die werkelijk aanwezig is. Een
            datumwijziging zet de stickerstatus niet vanzelf uit. Controleer die
            status mee wanneer je de voorraad corrigeert.
          </p>

          <h3>Als een product tijdelijk niet gecontroleerd moet worden</h3>
          <p>
            Zet Controles pauzeren aan en sla op. Het product blijft in Voorraad
            staan, maar verschijnt in geen enkele controleronde. Dat geldt ook
            voor ophalen wanneer er nog een stickerstatus geregistreerd staat.
          </p>

          <h3>Als de stickersoort moet veranderen</h3>
          <p>
            Handel bestaande gestickerde exemplaren eerst af. Zet de
            stickerstatus uit wanneer die exemplaren verwijderd of verkocht zijn
            en wijzig daarna de stickersoort. Zo blijft de geregistreerde soort
            overeenkomen met de echte stickers.
          </p>

          <aside className={styles.note}>
            <strong>Product bewerken kan ook tijdens een controle.</strong>
            <p>
              Open het productmenu en kies Product bewerken. Na opslaan keer je
              terug naar de controle. Controleer dan welke vraag of welk product
              nu aan de beurt is.
            </p>
          </aside>

          <Link href="/stockchecker" className={styles.actionLink}>
            Open Voorraad
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>

        <section id="toevoegen" className={styles.section}>
          <h2>Nieuwe producten toevoegen</h2>

          <p>
            Zoek eerst in Voorraad of het product al bestaat. De toevoegpagina
            verzamelt producten in een lokale lijst voordat je ze samen uploadt.
          </p>

          <ol className={styles.steps}>
            <li>Open Voorraad en tik op de plusknop.</li>
            <li>
              Kies de categorie en het controletype. Dagelijks hoort bij 30%.
              Vooruit, in sommige invoervelden Maandelijks genoemd, hoort bij
              50%.
            </li>
            <li>
              Vul de productnaam in of gebruik Slimmetje scannen. Controleer en
              corrigeer de herkende naam.
            </li>
            <li>
              Voeg eventueel een aparte productfoto toe. De gescande naamstrook
              wordt niet als productfoto gebruikt.
            </li>
            <li>
              Kies Toevoegen aan lijst. Herhaal dit voor de andere producten.
            </li>
            <li>Controleer de lijst en kies Alles uploaden naar DateCheck.</li>
            <li>
              Lees de bevestiging. Nieuwe producten krijgen geen datum en kunnen
              daarna via Stockcheck aangevuld worden.
            </li>
          </ol>

          <aside className={styles.note}>
            <strong>Een lokale lijst is nog geen gedeelde voorraad.</strong>
            <p>
              De lijst staat op dit apparaat, in deze browser, tot je uploadt of
              de lijst verwijdert. Upload ze voordat je browsergegevens wist of
              op een ander toestel verdergaat. Bestaande productnamen worden bij
              de upload overgeslagen.
            </p>
          </aside>

          <p>
            Ontbreken er later nog productfoto&apos;s? Gebruik Image Linker in
            Beheer om die aan te vullen.
          </p>

          <div className={styles.links}>
            <Link
              href="/stockchecker/new"
              className={styles.actionLink}
              prefetch={false}
            >
              Producten toevoegen
              <ArrowRight size={15} aria-hidden="true" />
            </Link>

            <Link
              href="/admin/imagelinker"
              className={styles.actionLink}
              prefetch={false}
            >
              Ontbrekende foto&apos;s
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section id="instellingen" className={styles.section}>
          <div className={styles.sectionHeading}>
            <Settings2 size={21} aria-hidden="true" />
            <h2>Instellingen onderhouden</h2>
          </div>

          <h3>Hoeveel dagen vooruit stickeren?</h3>
          <p>
            Stel Aantal dagen vooruit in. Vandaag en de laatste dag tellen beide
            mee. Met 0 dagen toont de vooruitcontrole alleen producten die
            vandaag vervallen.
          </p>

          <h3>Categorieën en winkelroute</h3>
          <p>
            Gebruik categorieën om producten te groeperen. Sleep ze via het
            versleepicoon om de winkelroute te ordenen en kies herkenbare
            kleuren. Sla je wijzigingen op.
          </p>
          <p>
            Een categorie met producten kan niet verwijderd worden. Een
            categorie die aan een levering hangt, moet je eerst uit die levering
            halen.
          </p>

          <h3>Leveringsplanning</h3>
          <ol className={styles.steps}>
            <li>
              Sla eventuele wijzigingen aan de bovenste instellingen eerst op.
            </li>
            <li>
              Kies Levering toevoegen en geef de levering een herkenbare naam.
            </li>
            <li>Selecteer één of meerdere leveringsdagen.</li>
            <li>Koppel alle categorieën die bij die levering horen.</li>
            <li>Laat de levering actief staan en kies Levering opslaan.</li>
          </ol>

          <p>
            Controleer de planning wanneer leveringsdagen of assortimentsgroepen
            veranderen. Zet een levering inactief als ze tijdelijk niet meer
            voorgesteld moet worden.
          </p>
          <p>
            De planning bepaalt welke categorieën bij een levering horen. Bij
            het starten van een controle kies je welke daarvan je op dat moment
            wilt nakijken.
          </p>

          <h3>Een korte onderhoudsronde</h3>
          <ul className={styles.list}>
            <li>
              Controleer na leveringen ook vroegere datums bij bestaande
              voorraad.
            </li>
            <li>
              Vul ontbrekende productfoto&apos;s en onduidelijke namen aan.
            </li>
            <li>
              Kijk na of gepauzeerde producten nog gepauzeerd moeten blijven.
            </li>
            <li>Controleer of categorieën nog bij de winkelindeling passen.</li>
            <li>Werk gewijzigde leveringsdagen en categorieën bij.</li>
          </ul>

          <Link
            href="/admin/settings"
            className={styles.actionLink}
            prefetch={false}
          >
            Open Instellingen
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>

        <section id="vragen" className={styles.section}>
          <h2>Veelgestelde vragen</h2>

          <div className={styles.questions}>
            {QUESTIONS.map((item) => (
              <details key={item.question} className={styles.question}>
                <summary>
                  <span>{item.question}</span>
                  <ChevronDown
                    size={18}
                    className={styles.chevron}
                    aria-hidden="true"
                  />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>

          <aside className={styles.note}>
            <strong>
              Teruggaan en opslaan zijn verschillende handelingen.
            </strong>
            <p>
              Gebruik de knop Terug in de controle wanneer je een antwoord wilt
              corrigeren en die mogelijkheid beschikbaar is. De terugknop van de
              browser draait opgeslagen antwoorden niet automatisch terug.
            </p>
          </aside>
        </section>

        <footer className={styles.footer}>
          <Link href="/">Terug naar DateCheck</Link>
          <a href="#bovenaan">Naar boven</a>
        </footer>
      </div>
    </main>
  );
}
