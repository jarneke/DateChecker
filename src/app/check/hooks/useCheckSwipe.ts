"use client";

import { useRef, useState, type TouchEvent } from "react";

const MIN_SWIPE_DISTANCE = 90;
const HORIZONTAL_RATIO = 1.5;
const MAX_SWIPE_OFFSET = 110;
const INTERACTIVE_SELECTOR =
    "button, a, input, textarea, select, [role='button']";

type CheckSwipeOptions = {
    gestureKey: string | null;
    onSwipeRight: () => void;
    onSwipeLeft: () => void;
};

type SwipeStart = {
    key: string;
    touchId: number;
    x: number;
    y: number;
};

type SwipePreview = {
    key: string;
    offset: number;
};

export function useCheckSwipe({
    gestureKey,
    onSwipeRight,
    onSwipeLeft,
}: CheckSwipeOptions) {
    const touchStart = useRef<SwipeStart | null>(null);
    const [preview, setPreview] = useState<SwipePreview | null>(null);

    function handleTouchCancel() {
        touchStart.current = null;
        setPreview(null);
    }

    function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
        handleTouchCancel();

        if (gestureKey === null || event.touches.length !== 1) return;

        const target = event.target;

        if (target instanceof Element && target.closest(INTERACTIVE_SELECTOR)) {
            return;
        }

        const touch = event.touches[0];

        touchStart.current = {
            key: gestureKey,
            touchId: touch.identifier,
            x: touch.clientX,
            y: touch.clientY,
        };
    }

    function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
        const start = touchStart.current;
        if (!start) return;

        const touch = event.touches[0];

        if (
            start.key !== gestureKey ||
            event.touches.length !== 1 ||
            touch?.identifier !== start.touchId
        ) {
            handleTouchCancel();
            return;
        }

        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        const offset =
            Math.abs(dx) > Math.abs(dy) * HORIZONTAL_RATIO
                ? Math.max(-MAX_SWIPE_OFFSET, Math.min(MAX_SWIPE_OFFSET, dx))
                : 0;

        setPreview({ key: start.key, offset });
    }

    function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
        const start = touchStart.current;
        handleTouchCancel();

        if (!start || start.key !== gestureKey) return;

        const touch = event.changedTouches[0];
        if (touch?.identifier !== start.touchId) return;

        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;

        if (
            Math.abs(dx) < MIN_SWIPE_DISTANCE ||
            Math.abs(dx) < Math.abs(dy) * HORIZONTAL_RATIO
        ) {
            return;
        }

        if (dx > 0) {
            onSwipeRight();
        } else {
            onSwipeLeft();
        }
    }

    return {
        swipeOffset: preview?.key === gestureKey ? preview.offset : 0,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleTouchCancel,
    };
}