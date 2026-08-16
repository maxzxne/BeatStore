import React from 'react';
import { useUiVersion } from '../contexts/UiVersionContext';

export const UiPage = ({ v1: V1, v2: V2, v3: V3 }) => {
  const { version } = useUiVersion();
  const Page = version === 'v3'
    ? (V3 || V2 || V1)
    : version === 'v2'
      ? (V2 || V1)
      : V1;
  return <Page />;
};

export const UiLayout = ({ v1: V1, v2: V2, v3: V3, ...props }) => {
  const { version } = useUiVersion();
  const Layout = version === 'v3'
    ? (V3 || V2 || V1)
    : version === 'v2'
      ? (V2 || V1)
      : V1;
  return <Layout {...props} />;
};
