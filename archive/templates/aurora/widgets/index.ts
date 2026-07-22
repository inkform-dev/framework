import type { ComponentType } from 'react';
import { Counter } from './Counter';

/**
 * Custom widget registry. Put your component at widgets/<Name>.tsx, import
 * it here, and add it to this map — the key becomes the JSX tag name your
 * MDX/CMS content uses (<Name ... />). Framework docs: "Custom Widgets."
 */
const widgets: Record<string, ComponentType<any>> = {
  Counter,
};

export default widgets;
