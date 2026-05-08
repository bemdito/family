import React from 'react';
import { useHref, useNavigate, type NavigateOptions, type To } from 'react-router';

type AppLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  to: To;
  replace?: boolean;
  state?: NavigateOptions['state'];
};

function isModifiedEvent(event: React.MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
}

export function AppLink({
  to,
  replace = false,
  state,
  target,
  onClick,
  children,
  ...props
}: AppLinkProps) {
  const href = useHref(to);
  const navigate = useNavigate();

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);

      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        target === '_blank' ||
        isModifiedEvent(event)
      ) {
        return;
      }

      event.preventDefault();
      navigate(to, { replace, state, flushSync: true });
    },
    [navigate, onClick, replace, state, target, to]
  );

  return (
    <a href={href} target={target} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
