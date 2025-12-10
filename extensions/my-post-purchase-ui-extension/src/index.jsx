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
// const APP_URL = "https://north-antibody-config-relatives.trycloudflare.com";

// Preload data from your app server to ensure that the extension loads quickly.
extend(
  "Checkout::PostPurchase::ShouldRender",
  async ({ inputData, storage }) => {
    try {
      console.log("SW extension code has been Started");
      
      // Helper function to extract numeric ID from GID
      const extractNumericId = (gid, returnAsInt = false) => {
        if (!gid) return null;
        let numericId;
        if (typeof gid === 'string' && gid.startsWith('gid://')) {
          numericId = gid.split('/').pop();
        } else {
          numericId = gid;
        }
        return returnAsInt ? parseInt(numericId) : numericId;
      };

      // Get purchased products from the initial purchase
      const purchasedProducts = (inputData.initialPurchase.lineItems || []).map(lineItem => ({
        productId: extractNumericId(lineItem.product.id),
        variantId: extractNumericId(lineItem.product.variant.id),
        title: lineItem.product.title,
        variantTitle: lineItem.product.variant.title,
      }));
      
      // Fetch offers based on all purchased products in a single request
      let uniqueOffers = [];
      
      try {
        const response = await fetch(
          `${APP_URL}/api/offer`, 
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${inputData.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              purchasedProducts: purchasedProducts,
              shopDomain: inputData.shop.domain,
            })
          }
        );
        
        if (response.ok) {
          const result = await response.json();
          uniqueOffers = result.offers || [];
          console.log("SW what is result", result);
        } else {
          console.error('Failed to fetch offers:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching offers:', error);
      }

      // Convert to the format expected by the UI - create separate offers for each product
      const formattedOffers = [];
      
      uniqueOffers.forEach((offer) => {
        // Create an offer for each product in the offer
        if (offer.products && offer.products.length > 0) {
          offer.products.forEach((offerProduct, productIndex) => {
            // Extract numeric variant ID, fallback to product ID if no variant
            let variantID = null;
            if (offerProduct?.shopify_variant_id) {
              variantID = extractNumericId(offerProduct.shopify_variant_id, true);
            } else if (offerProduct?.shopify_product_id) {
              variantID = extractNumericId(offerProduct.shopify_product_id, true);
            }

            // Clean price values (remove $ and convert to number format)
            const cleanPrice = (price) => {
              if (!price) return "0";
              return price.toString().replace('$', '').replace(',', '');
            };

            formattedOffers.push({
              id: formattedOffers.length + 1, // Use sequential ID as expected by the UI
              title: offer.offer_title || "Special Offer",
              productTitle: offerProduct?.product_title || "Special Product",
              productImageURL: offerProduct?.image_url || "https://cdn.shopify.com/s/files/1/0070/7032/files/placeholder-images-image_large.png",
              productDescription: [offer.offer_description || "Amazing deal just for you!"],
              originalPrice: cleanPrice(offerProduct?.variant_price || offerProduct?.product_price || "0"),
              discountedPrice: cleanPrice(offerProduct?.variant_price || offerProduct?.product_price || "0"), // Will be calculated by Shopify
              changes: [
                {
                  type: "add_variant",
                  variantID: variantID || 0,
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
              // Store original offer data for reference
              originalOffer: offer,
              productIndex: productIndex,
            });
          });
        }
      });

      console.log("SW what is formattedOffers", formattedOffers);

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
  console.log("offers storage", storage);

  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);
  console.log("currentOfferIndex", currentOfferIndex);
  const purchaseOption = offers[currentOfferIndex];
  console.log("purchaseOption", purchaseOption);

  // Define the changes that you want to make to the purchase, including the discount to the product.
  useEffect(() => {
    async function calculatePurchase() {
      // Call Shopify to calculate the new price of the purchase, if the above changes are applied.
      const result = await calculateChangeset({
        changes: purchaseOption.changes,
      });

      console.log("calculatedPurchaseResult", result);
      setCalculatedPurchase(result.calculatedPurchase);
      setLoading(false);
    }

    calculatePurchase();
  }, [calculateChangeset, purchaseOption.changes, currentOfferIndex]);

  // Extract values from the calculated purchase.
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

  console.log("calculatedPurchase", calculatedPurchase);

  async function acceptOffer() {
    console.log("SW accept offer has been called");
    console.log("offersssss storage", storage);
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
        offer: purchaseOption, // Send the complete offer object instead of just ID
        storage: storage,
        shopDomain: inputData.shop.domain,
        customerId: inputData.initialPurchase.customerId,
        sessionId: inputData.sessionId,
        userAgent: navigator.userAgent,
      }),
    })
      .then((response) => response.json())
      .then((response) => response.token)
      .catch((e) => console.log(e));

    // Make a request to Shopify servers to apply the changeset.
    await applyChangeset(token);
    console.log("applyChangeset token", token);
    
    // Redirect to the thank-you page.
    done();
  }

  async function declineOffer() {
    setLoading(true);

    // Track decline analytics
    try {
      await fetch(`${APP_URL}/api/analytics/decline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${inputData.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shopDomain: inputData.shop.domain,
          offerId: purchaseOption?.originalOffer?.id,
          customerId: inputData.initialPurchase.customerId,
          orderId: inputData.initialPurchase.referenceId,
          productId: purchaseOption?.changes?.[0]?.variantID?.toString(),
          sessionId: inputData.sessionId,
          userAgent: navigator.userAgent,
          eventData: {
            offerTitle: purchaseOption?.title,
            offerContext: 'post_purchase_decline',
            currentOfferIndex: currentOfferIndex,
            totalOffers: offers.length,
          },
        }),
      });
    } catch (error) {
      console.error("Error tracking decline analytics:", error);
      // Continue with decline logic even if analytics fails
    }

    if (currentOfferIndex < offers.length - 1) {
      setCurrentOfferIndex(currentOfferIndex + 1);
      setLoading(false);
      console.log(
        `Offer declined. Moving to next offer: ${currentOfferIndex + 1}`
      );
    } else {
      // No more offers, go to the thank you page
      console.log("No more offers. Redirecting to the thank you page.");
      done();
    }
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