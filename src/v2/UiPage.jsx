import React from 'react';
import { useUiVersion } from '../contexts/UiVersionContext';

export const UiPage = ({ v1: V1, v2: V2 }) => {
  const { isV2 } = useUiVersion();
  const Page = isV2 ? V2 : V1;
  return <Page />;
};

export const UiLayout = ({ v1: V1, v2: V2, ...props }) => {
  const { isV2 } = useUiVersion();
  const Layout = isV2 ? V2 : V1;
  return <Layout {...props} />;
};
