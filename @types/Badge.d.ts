import { SvelteComponent } from './shared';

declare type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';

interface BadgeProps {
    variant: Variant;
    pill?: boolean;
}

declare class Badge extends SvelteComponent<BadgeProps> { }

export default Badge;