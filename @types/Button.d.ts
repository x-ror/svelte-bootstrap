import { SvelteComponent } from './shared';

declare type Variant =
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "light"
    | "dark"
    | "link"
    | "outline-primary"
    | "outline-secondary"
    | "outline-success"
    | "outline-danger"
    | "outline-warning"
    | "outline-info"
    | "outline-light"
    | "outline-dark";


declare type Size = | "sm" | "lg"


interface ButtonProps {
    active?: boolean;
    block?: false;
    disabled?: false;
    variant?: Variant;
    size?: Size;
    type?: "button";
}

declare class Button extends SvelteComponent<ButtonProps> { }

export default Button;