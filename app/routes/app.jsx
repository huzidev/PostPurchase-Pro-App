import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { SubscriptionProvider, useRouteSubscriptionCheck } from "../hooks/useSubscription.jsx";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();
  function RouteSubscriptionRunner() {
    useRouteSubscriptionCheck();
    return null;
  }

  return (
    <ShopifyAppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={{}}>
        <SubscriptionProvider>
          <RouteSubscriptionRunner />
          <s-app-nav>
          <s-link href="/app">Dashboard</s-link>
          <s-link href="/app/analytics">Analytics</s-link>
          <s-link href="/app/offers">Offers</s-link>
          <s-link href="/app/plans">Plans</s-link>
        </s-app-nav>
          <Outlet />
        </SubscriptionProvider>
      </PolarisAppProvider>
    </ShopifyAppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};