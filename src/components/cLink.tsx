import { h } from '../sinuous.js';
import { colours, css } from 'styletakeout.macro';

const Link = ({ to, name }: { to: string, name?: string }): h.JSX.Element =>
  <a
    class={
      css`
        color: ${colours.blue._400};
        &:hover {
          color: ${colours.blue._500};
          text-decoration: underline;
        }
      `}
    href={to}
  >
    {name ?? to}
  </a>;

export { Link };
