import type { MouseEventHandler, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type PolarisLinkProps = {
  url: string;
  children?: ReactNode;
  external?: boolean;
  className?: string;
  id?: string;
  target?: string;
  rel?: string;
  download?: string | boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

/** Adapter so Polaris `url` props navigate with React Router. */
export function PolarisLink({ url, children, external, target, rel, ...rest }: PolarisLinkProps) {
  if (external) {
    return (
      <a {...rest} href={url} target={target ?? '_blank'} rel={rel ?? 'noreferrer'}>
        {children}
      </a>
    );
  }

  return (
    <Link {...rest} to={url}>
      {children}
    </Link>
  );
}
