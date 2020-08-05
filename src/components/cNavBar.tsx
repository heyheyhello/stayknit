import { h } from '../sinuous.js';
import { addMessage } from '../state/messages.js';

const NavBar = ({ items }: { items: string[] }): h.JSX.Element =>
  <div class="flex mb-2 border-t border-r border-l text-sm rounded">
    {items.map(text =>
      <a
        class="flex-1 text-center px-4 py-2 border-b-2 bg-white hover:bg-gray-100 hover:border-purple-500"
        onClick={() => addMessage(text)}
      >
        {text}
      </a>
    )}
  </div>;

export { NavBar };
