import { SvelteComponent } from './shared';

type Display = | "display-1" | "display-2" | "display-3" | "display-4" | "display-5" | "display-6"

interface HeadingProps {
    display?: Display
}

declare class H1 extends SvelteComponent<HeadingProps> { }
declare class H2 extends SvelteComponent<HeadingProps> { }
declare class H3 extends SvelteComponent<HeadingProps> { }
declare class H4 extends SvelteComponent<HeadingProps> { }
declare class H5 extends SvelteComponent<HeadingProps> { }
declare class H6 extends SvelteComponent<HeadingProps> { }

export {
    H1,
    H2,
    H3,
    H4,
    H5,
    H6,
} 