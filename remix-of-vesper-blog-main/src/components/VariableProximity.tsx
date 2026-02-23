import { forwardRef, useMemo, useRef, useEffect, useCallback, RefObject } from 'react';
import { motion } from 'framer-motion';
import './VariableProximity.css';

type Falloff = 'linear' | 'exponential' | 'gaussian';

interface VariableProximityProps {
    label: string;
    fromFontVariationSettings: string;
    toFontVariationSettings: string;
    containerRef: RefObject<HTMLElement | null>;
    radius?: number;
    falloff?: Falloff;
    className?: string;
    style?: React.CSSProperties;
    onClick?: React.MouseEventHandler<HTMLSpanElement>;
}

function useAnimationFrame(callback: () => void) {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        let frameId: number;
        const loop = () => {
            callbackRef.current();
            frameId = requestAnimationFrame(loop);
        };
        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, []);
}

function useMousePositionRef(containerRef: RefObject<HTMLElement | null>) {
    const positionRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const updatePosition = (x: number, y: number) => {
            if (containerRef?.current) {
                const rect = containerRef.current.getBoundingClientRect();
                positionRef.current = { x: x - rect.left, y: y - rect.top };
            } else {
                positionRef.current = { x, y };
            }
        };
        const handleMouseMove = (ev: MouseEvent) => updatePosition(ev.clientX, ev.clientY);
        const handleTouchMove = (ev: TouchEvent) => {
            const touch = ev.touches[0];
            updatePosition(touch.clientX, touch.clientY);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
        };
    }, [containerRef]);

    return positionRef;
}

const VariableProximity = forwardRef<HTMLSpanElement, VariableProximityProps>((props, ref) => {
    const {
        label,
        fromFontVariationSettings,
        toFontVariationSettings,
        containerRef,
        radius = 80,
        falloff = 'linear',
        className = '',
        onClick,
        style,
    } = props;

    const letterRefs = useRef<(HTMLElement | null)[]>([]);
    const interpolatedSettingsRef = useRef<string[]>([]);
    const mousePositionRef = useMousePositionRef(containerRef);
    const lastPositionRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });

    const parsedSettings = useMemo(() => {
        const parse = (str: string) =>
            new Map(
                str.split(',').map(s => {
                    const [name, value] = s.trim().split(' ');
                    return [name.replace(/['"]/g, ''), parseFloat(value)] as [string, number];
                })
            );
        const from = parse(fromFontVariationSettings);
        const to = parse(toFontVariationSettings);
        return Array.from(from.entries()).map(([axis, fromValue]) => ({
            axis,
            fromValue,
            toValue: to.get(axis) ?? fromValue,
        }));
    }, [fromFontVariationSettings, toFontVariationSettings]);

    const calcFalloff = useCallback(
        (distance: number) => {
            const norm = Math.min(Math.max(1 - distance / radius, 0), 1);
            switch (falloff) {
                case 'exponential': return norm ** 2;
                case 'gaussian': return Math.exp(-((distance / (radius / 2)) ** 2) / 2);
                default: return norm;
            }
        },
        [radius, falloff]
    );

    useAnimationFrame(() => {
        if (!containerRef?.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const { x, y } = mousePositionRef.current;
        if (lastPositionRef.current.x === x && lastPositionRef.current.y === y) return;
        lastPositionRef.current = { x, y };

        letterRefs.current.forEach((letterRef, index) => {
            if (!letterRef) return;
            const rect = letterRef.getBoundingClientRect();
            const cx = rect.left + rect.width / 2 - containerRect.left;
            const cy = rect.top + rect.height / 2 - containerRect.top;
            const distance = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

            if (distance >= radius) {
                letterRef.style.fontVariationSettings = fromFontVariationSettings;
                return;
            }

            const fv = calcFalloff(distance);
            const newSettings = parsedSettings
                .map(({ axis, fromValue, toValue }) =>
                    `'${axis}' ${fromValue + (toValue - fromValue) * fv}`
                )
                .join(', ');
            interpolatedSettingsRef.current[index] = newSettings;
            letterRef.style.fontVariationSettings = newSettings;
        });
    });

    const words = label.split(' ');
    let letterIndex = 0;

    return (
        <span
            ref={ref}
            className={`variable-proximity ${className}`}
            onClick={onClick}
            style={{ display: 'inline', ...style }}
        >
            {words.map((word, wordIndex) => (
                <span key={wordIndex} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                    {word.split('').map(letter => {
                        const idx = letterIndex++;
                        return (
                            <motion.span
                                key={idx}
                                ref={(el: HTMLElement | null) => { letterRefs.current[idx] = el; }}
                                style={{
                                    display: 'inline-block',
                                    fontVariationSettings: interpolatedSettingsRef.current[idx],
                                }}
                                aria-hidden="true"
                            >
                                {letter}
                            </motion.span>
                        );
                    })}
                    {wordIndex < words.length - 1 && (
                        <span style={{ display: 'inline-block' }}>&nbsp;</span>
                    )}
                </span>
            ))}
            <span className="sr-only">{label}</span>
        </span>
    );
});

VariableProximity.displayName = 'VariableProximity';
export default VariableProximity;
