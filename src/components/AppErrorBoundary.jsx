import React from 'react';
import ErrorPage from '../pages/ErrorPage';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('AppErrorBoundary', error, info);
    }
  }

  render() {
    if (this.state.error) {
      return <ErrorPage variant="error" />;
    }
    return this.props.children;
  }
}
