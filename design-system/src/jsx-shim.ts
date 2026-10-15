// react/jsx-runtime → window.React.createElement (React is a global in the preview frame).
import React from 'react';

type Props = Record<string, unknown> & { children?: unknown };
export const Fragment = React.Fragment;
export function jsx(type: React.ElementType, props: Props, key?: React.Key) {
  const { children, ...rest } = props ?? {};
  const p = key === undefined ? rest : { ...rest, key };
  return Array.isArray(children) ? React.createElement(type, p, ...children) : children === undefined ? React.createElement(type, p) : React.createElement(type, p, children as React.ReactNode);
}
export const jsxs = jsx;
export const jsxDEV = jsx;
