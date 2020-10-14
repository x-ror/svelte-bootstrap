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
    block?: boolean;
    disabled?: boolean;
    /**
    * One or more button variant combinations
    *
    * buttons may be one of a variety of visual variants such as:
    *
    * `'primary', 'secondary', 'success', 'danger', 'warning', 'info', 'dark', 'light', 'link'`
    *
    * as well as "outline" versions (prefixed by 'outline-*')
    *
    * `'outline-primary', 'outline-secondary', 'outline-success', 'outline-danger', 'outline-warning', 'outline-info', 'outline-dark', 'outline-light'`
    */
    variant?: Variant;
    size?: Size;
    href?: string;
    as?: 'input'
    type?: "button" | 'submit' | 'reset';
}

declare class Button extends SvelteComponent<ButtonProps> { }

export default Button;