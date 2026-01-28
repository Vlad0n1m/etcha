import React from 'react';

export interface NavItem {
  label: string;
  href: string;
}

export interface FloatingElementProps {
  delay?: number;
  x?: number;
  y?: number;
  children: React.ReactNode;
  className?: string;
}