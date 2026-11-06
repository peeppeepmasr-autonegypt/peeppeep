/**
 * The minisite icon set.
 *
 * One stroke weight, one grid, currentColor: an icon that inherits its colour is
 * the only kind that survives a dark pane, a light pane and an amber plate
 * without three variants. Emoji were used here before, which meant the glyph
 * differed by operating system and nothing about the control read as *ours*.
 *
 * `dir` on the parent does not flip an SVG, so arrows are drawn for reading
 * direction: <ArrowStep direction="back"> always points where "previous" is.
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** `back`/`forward` are reading-direction steps, so RTL gets mirrored automatically. */
export function ArrowStep({ direction, ...props }: IconProps & { direction: 'back' | 'forward' }) {
  const d = direction === 'back' ? 'M14.5 5 8 12l6.5 7' : 'M9.5 5 16 12l-6.5 7';
  return <Svg {...props}><path d={d} /></Svg>;
}

export function IconPlay(props: IconProps) {
  return <Svg {...props}><path d="M8 5.5v13l11-6.5z" /></Svg>;
}

export function IconPause(props: IconProps) {
  return <Svg {...props}><path d="M9 5v14M15 5v14" /></Svg>;
}

export function IconVolumeMuted(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z" />
      <path d="M16 9.5l4 5M20 9.5l-4 5" />
    </Svg>
  );
}

export function IconVolumeOn(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11" />
    </Svg>
  );
}

export function IconExpand(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5" />
    </Svg>
  );
}

export function IconCollapse(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9h5V4M20 9h-5V4M20 15h-5v5M4 15h5v5" />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return <Svg {...props}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
}

/** A camera body with an open shutter: "this frame still needs its photograph". */
export function IconCamera(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 8.5h3l1.5-2h9L18 8.5h3v11H3z" />
      <circle cx="12" cy="14" r="3.2" />
    </Svg>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.5 3.5h3l1.2 3.4-1.9 1.4a11 11 0 0 0 5 5l1.4-1.9 3.4 1.2v3a1.9 1.9 0 0 1-2.1 1.9A15.5 15.5 0 0 1 4.6 5.6 1.9 1.9 0 0 1 6.5 3.5z" />
    </Svg>
  );
}

/** WhatsApp mark, drawn on the same 24px grid rather than pasted from a brand sheet. */
export function IconWhatsApp(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20l1.3-4A8.2 8.2 0 1 1 8.6 19z" />
      <path d="M9.2 9.4c.3 2.2 2.4 4.3 4.6 4.7l1.1-1.4 1.6.8c-.2 1.3-1.4 1.9-2.6 1.6a8.6 8.6 0 0 1-6.4-6.4c-.3-1.2.3-2.4 1.6-2.6l.8 1.6z" />
    </Svg>
  );
}

export function IconPin(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21s6-6.1 6-10.4A6 6 0 0 0 6 10.6C6 14.9 12 21 12 21z" />
      <circle cx="12" cy="10.4" r="2.2" />
    </Svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.6V12l3.2 2" />
    </Svg>
  );
}

export function IconGear(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" />
    </Svg>
  );
}

export function IconExternal(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 5h5v5M19 5l-7.5 7.5" />
      <path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
    </Svg>
  );
}

/** Diagonal hazard stripes, reused by the "media not authored yet" state. */
export function IconFilm(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="6" width="17" height="12" rx="1.5" />
      <path d="M8 6v12M16 6v12M3.5 12h17" />
    </Svg>
  );
}
