import React from "react";

interface LinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

const Link = ({ href, children, className, onClick }: LinkProps) => (
  <a href={href} className={className} onClick={onClick}>
    {children}
  </a>
);

export default Link;
