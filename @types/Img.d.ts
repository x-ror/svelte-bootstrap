import { SvelteComponent } from './shared';

declare type Variant = 'fluid' | 'thumbnail'

interface ImgProps {
    src: string;
    alt: string;
    variant?: Variant;
}

declare class Img extends SvelteComponent<ImgProps> { }

export default Img;