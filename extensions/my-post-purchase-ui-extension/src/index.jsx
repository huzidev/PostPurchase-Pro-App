import { useEffect, useState } from "react";
import {
  extend,
  render,
  useExtensionInput,
  BlockStack,
  Button,
  CalloutBanner,
  Heading,
  Image,
  Text,
  TextContainer,
  Separator,
  Tiles,
  TextBlock,
  Layout,
} from "@shopify/post-purchase-ui-extensions-react";

// For local development, replace APP_URL with your local tunnel URL.
const APP_URL = "https://post-purchase-pro-app.vercel.app";

// Preload data from your app server to ensure that the extension loads quickly.
extend(
  "Checkout::PostPurchase::ShouldRender",
  async ({ inputData, storage }) => {
    try {
      // Get purchased products from the initial purchase
      const purchasedProducts = inputData.initialPurchase.lineItems || [];
      
      // Fetch offers for each purchased product
      let allOffers = [];
      
      for (const lineItem of purchasedProducts) {
        const productId = lineItem.product.id;
        const variantId = lineItem.variant.id;
        
        try {
          const response = await fetch(
            `${APP_URL}/api/offer?productId=${productId}&variantId=${variantId}&shop=${inputData.shop.domain}`, 
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${inputData.token}`,
                "Content-Type": "application/json",
              },
            }
          );
          
          if (response.ok) {
            const result = await response.json();
            if (result.offers && result.offers.length > 0) {
              allOffers = allOffers.concat(result.offers);
            }
          }
        } catch (error) {
          console.error(`Error fetching offers for product ${productId}:`, error);
        }
      }

      // Remove duplicate offers (in case multiple purchased products trigger the same offer)
      const uniqueOffers = allOffers.filter((offer, index, self) => 
        index === self.findIndex(o => o.id === offer.id)
      );

      // Convert to the format expected by the UI
      const formattedOffers = uniqueOffers.map(offer => ({
        id: offer.id,
        title: offer.offer_title || "Special Offer",
        productTitle: offer.products && offer.products.length > 0 
          ? offer.products[0].product_title 
          : "Special Product",
        productImageURL: offer.products && offer.products.length > 0 && offer.products[0].image_url
          ? offer.products[0].image_url
          : "https://cdn.shopify.com/s/files/1/0070/7032/files/placeholder-images-image_large.png",
        productDescription: [offer.offer_description || "Amazing deal just for you!"],
        originalPrice: offer.products && offer.products.length > 0 
          ? (offer.products[0].variant_price || offer.products[0].product_price || "0").replace('$', '')
          : "0",
        discountedPrice: "0", // Will be calculated by Shopify
        changes: [
          {
            type: "add_variant",
            variantID: offer.products && offer.products.length > 0 && offer.products[0].shopify_variant_id
              ? parseInt(offer.products[0].shopify_variant_id)
              : parseInt(offer.products[0]?.shopify_product_id || 0),
            quantity: 1,
            discount: {
              value: offer.discount_value || 0,
              valueType: offer.discount_type === 'percentage' ? "percentage" : "fixedAmount",
              title: offer.discount_type === 'percentage' 
                ? `${offer.discount_value}% off`
                : `$${offer.discount_value} off`,
            },
          },
        ],
      }));

      await storage.update({ offers: formattedOffers });

      // Only show the post-purchase page if we have offers
      return { render: formattedOffers.length > 0 };
    } catch (error) {
      console.error("Error in ShouldRender:", error);
      // Fallback to not showing the extension if there's an error
      return { render: false };
    }
  }
);

render("Checkout::PostPurchase::Render", () => <App />);

export function App() {
  const { storage, inputData, calculateChangeset, applyChangeset, done } =
    useExtensionInput();
  const [loading, setLoading] = useState(true);
  const [calculatedPurchase, setCalculatedPurchase] = useState();

  const { offers } = storage.initialData;

  const purchaseOption = offers[0];

  // Define the changes that you want to make to the purchase, including the discount to the product.
  useEffect(() => {
    async function calculatePurchase() {
      // Call Shopify to calculate the new price of the purchase, if the above changes are applied.
      const result = await calculateChangeset({
        changes: purchaseOption.changes,
      });

      setCalculatedPurchase(result.calculatedPurchase);
      setLoading(false);
    }

    calculatePurchase();
  }, [calculateChangeset, purchaseOption.changes]);

  // Extract values from the calculated purchase.
  const shipping =
    calculatedPurchase?.addedShippingLines[0]?.priceSet?.presentmentMoney
      ?.amount;
  const taxes =
    calculatedPurchase?.addedTaxLines[0]?.priceSet?.presentmentMoney?.amount;
  const total = calculatedPurchase?.totalOutstandingSet.presentmentMoney.amount;
  const discountedPrice =
    calculatedPurchase?.updatedLineItems[0].totalPriceSet.presentmentMoney
      .amount;
  const originalPrice =
    calculatedPurchase?.updatedLineItems[0].priceSet.presentmentMoney.amount;

  async function acceptOffer() {
    setLoading(true);

    // Make a request to your app server to sign the changeset with your app's API secret key.
    const token = await fetch(`${APP_URL}/api/sign-changeset`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${inputData.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        referenceId: inputData.initialPurchase.referenceId,
        changes: purchaseOption.id,
      }),
    })
      .then((response) => response.json())
      .then((response) => response.token)
      .catch((e) => console.log(e));

    // Make a request to Shopify servers to apply the changeset.
    await applyChangeset(token);

    // Redirect to the thank-you page.
    done();
  }

  function declineOffer() {
    setLoading(true);
    // Redirect to the thank-you page
    done();
  }

  return (
    <BlockStack spacing="loose">
      <CalloutBanner>
        <BlockStack spacing="tight">
          <TextContainer>
            <Text size="medium" emphasized>
              It&#39;s not too late to add this to your order
            </Text>
          </TextContainer>
          <TextContainer>
            <Text size="medium">
              Add the {purchaseOption.productTitle} to your order and{" "}
            </Text>
            <Text size="medium" emphasized>
              {purchaseOption.changes[0].discount.title}
            </Text>
          </TextContainer>
        </BlockStack>
      </CalloutBanner>
      <Layout
        media={[
          { viewportSize: "small", sizes: [1, 0, 1], maxInlineSize: 0.9 },
          { viewportSize: "medium", sizes: [532, 0, 1], maxInlineSize: 420 },
          { viewportSize: "large", sizes: [560, 38, 340] },
        ]}
      >
        <Image
          description="product photo"
          source={purchaseOption.productImageURL}
        />
        <BlockStack />
        <BlockStack>
          <Heading>{purchaseOption.productTitle}</Heading>
          <PriceHeader
            discountedPrice={discountedPrice}
            originalPrice={originalPrice}
            loading={!calculatedPurchase}
          />
          <ProductDescription textLines={purchaseOption.productDescription} />
          <BlockStack spacing="tight">
            <Separator />
            <MoneyLine
              label="Subtotal"
              amount={discountedPrice}
              loading={!calculatedPurchase}
            />
            <MoneyLine
              label="Shipping"
              amount={shipping}
              loading={!calculatedPurchase}
            />
            <MoneyLine
              label="Taxes"
              amount={taxes}
              loading={!calculatedPurchase}
            />
            <Separator />
            <MoneySummary label="Total" amount={total} />
          </BlockStack>
          <BlockStack>
            <Button onPress={acceptOffer} submit loading={loading}>
              Pay now · {formatCurrency(total)}
            </Button>
            <Button onPress={declineOffer} subdued loading={loading}>
              Decline this offer
            </Button>
          </BlockStack>
        </BlockStack>
      </Layout>
    </BlockStack>
  );
}

function PriceHeader({ discountedPrice, originalPrice, loading }) {
  return (
    <TextContainer alignment="leading" spacing="loose">
      <Text role="deletion" size="large">
        {!loading && formatCurrency(originalPrice)}
      </Text>
      <Text emphasized size="large" appearance="critical">
        {" "}
        {!loading && formatCurrency(discountedPrice)}
      </Text>
    </TextContainer>
  );
}

function ProductDescription({ textLines }) {
  return (
    <BlockStack spacing="xtight">
      {textLines.map((text, index) => (
        <TextBlock key={index} subdued>
          {text}
        </TextBlock>
      ))}
    </BlockStack>
  );
}

function MoneyLine({ label, amount, loading = false }) {
  return (
    <Tiles>
      <TextBlock size="small">{label}</TextBlock>
      <TextContainer alignment="trailing">
        <TextBlock emphasized size="small">
          {loading ? "-" : formatCurrency(amount)}
        </TextBlock>
      </TextContainer>
    </Tiles>
  );
}

function MoneySummary({ label, amount }) {
  return (
    <Tiles>
      <TextBlock size="medium" emphasized>
        {label}
      </TextBlock>
      <TextContainer alignment="trailing">
        <TextBlock emphasized size="medium">
          {formatCurrency(amount)}
        </TextBlock>
      </TextContainer>
    </Tiles>
  );
}

function formatCurrency(amount) {
  if (!amount || parseInt(amount, 10) === 0) {
    return "Free";
  }
  return `$${amount}`;
}