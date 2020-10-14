import { SvelteComponent } from './shared';

interface SafeAnchorProps {
    href: string;
    disabled?: boolean;
    role?: string | 'button';
    tabindex?: number;
}

declare class SafeAnchor extends SvelteComponent<SafeAnchorProps> { }

export default SafeAnchor;