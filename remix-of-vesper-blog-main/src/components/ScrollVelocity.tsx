import { useRef, useLayoutEffect, useState } from 'react';
import {
    motion,
    useScroll,
    useSpring,
    useTransform,
    useMotionValue,
    useVelocity,
    useAnimationFrame,
} from 'framer-motion';
import './ScrollVelocity.css';

function useElementWidth(ref: React.RefObject<HTMLElement | null>): number {
    const [width, setWidth] = useState(0);
    useLayoutEffect(() => {
        function update() {
            if (ref.current) setWidth(ref.current.offsetWidth);
        }
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [ref]);
    return width;
}

interface VelocityTextProps {
    children: React.ReactNode;
    baseVelocity?: number;
    scrollContainerRef?: React.RefObject<HTMLElement>;
    className?: string;
    damping?: number;
    stiffness?: number;
    numCopies?: number;
    velocityMapping?: { input: [number, number]; output: [number, number] };
    parallaxClassName?: string;
    scrollerClassName?: string;
    parallaxStyle?: React.CSSProperties;
    scrollerStyle?: React.CSSProperties;
}

function VelocityText({
    children,
    baseVelocity = 100,
    scrollContainerRef,
    className = '',
    damping = 50,
    stiffness = 400,
    numCopies = 6,
    velocityMapping = { input: [0, 1000], output: [0, 5] },
    parallaxClassName = 'parallax',
    scrollerClassName = 'scroller',
    parallaxStyle,
    scrollerStyle,
}: VelocityTextProps) {
    const baseX = useMotionValue(0);
    const scrollOptions = scrollContainerRef ? { container: scrollContainerRef } : {};
    const { scrollY } = useScroll(scrollOptions as any);
    const scrollVelocity = useVelocity(scrollY);
    const smoothVelocity = useSpring(scrollVelocity, { damping, stiffness });
    const velocityFactor = useTransform(
        smoothVelocity,
        velocityMapping.input,
        velocityMapping.output,
        { clamp: false }
    );

    const copyRef = useRef<HTMLSpanElement>(null);
    const copyWidth = useElementWidth(copyRef);

    function wrap(min: number, max: number, v: number): number {
        const range = max - min;
        return ((((v - min) % range) + range) % range) + min;
    }

    const x = useTransform(baseX, (v) => {
        if (copyWidth === 0) return '0px';
        return `${wrap(-copyWidth, 0, v)}px`;
    });

    const directionFactor = useRef(1);
    useAnimationFrame((_t, delta) => {
        let moveBy = directionFactor.current * baseVelocity * (delta / 1000);
        if (velocityFactor.get() < 0) directionFactor.current = -1;
        else if (velocityFactor.get() > 0) directionFactor.current = 1;
        moveBy += directionFactor.current * moveBy * velocityFactor.get();
        baseX.set(baseX.get() + moveBy);
    });

    return (
        <div className={parallaxClassName} style={parallaxStyle}>
            <motion.div className={scrollerClassName} style={{ x, ...scrollerStyle }}>
                {Array.from({ length: numCopies }).map((_, i) => (
                    <span className={className} key={i} ref={i === 0 ? copyRef : null}>
                        {children}
                    </span>
                ))}
            </motion.div>
        </div>
    );
}

export interface ScrollVelocityProps {
    texts?: string[];
    velocity?: number;
    className?: string;
    damping?: number;
    stiffness?: number;
    numCopies?: number;
    velocityMapping?: { input: [number, number]; output: [number, number] };
    scrollContainerRef?: React.RefObject<HTMLElement>;
    parallaxClassName?: string;
    scrollerClassName?: string;
    parallaxStyle?: React.CSSProperties;
    scrollerStyle?: React.CSSProperties;
}

export const ScrollVelocity = ({
    texts = [],
    velocity = 100,
    className = '',
    damping = 50,
    stiffness = 400,
    numCopies = 6,
    velocityMapping = { input: [0, 1000], output: [0, 5] },
    scrollContainerRef,
    parallaxClassName = 'parallax',
    scrollerClassName = 'scroller',
    parallaxStyle,
    scrollerStyle,
}: ScrollVelocityProps) => (
    <section>
        {texts.map((text, index) => (
            <VelocityText
                key={index}
                className={className}
                baseVelocity={index % 2 !== 0 ? -velocity : velocity}
                scrollContainerRef={scrollContainerRef}
                damping={damping}
                stiffness={stiffness}
                numCopies={numCopies}
                velocityMapping={velocityMapping}
                parallaxClassName={parallaxClassName}
                scrollerClassName={scrollerClassName}
                parallaxStyle={parallaxStyle}
                scrollerStyle={scrollerStyle}
            >
                {text}&nbsp;
            </VelocityText>
        ))}
    </section>
);

export default ScrollVelocity;
