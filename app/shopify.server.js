import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { MongoDBSessionStorage } from "@shopify/shopify-app-session-storage-mongodb";
import { connectDB } from "./db.server";
import { sessionModel , merchantInfoModel , billingModel } from "./db.schema";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/POSApp";
connectDB(MONGO_URI);

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January26,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new MongoDBSessionStorage(MONGO_URI),
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true,
  },
  hooks: {
    afterAuth: async ({ session, admin }) => {
      try {
        shopify.registerWebhooks({ session });

        const { shop, accessToken, scope } = session;

        const shopDetailsResponse = await admin.graphql(`
        query {
          shop {
            myshopifyDomain
            email
            currencyCode
            shopOwnerName
            ianaTimezone
            checkoutApiSupported
          }
        }
      `);

        const shopDetails = await shopDetailsResponse.json();
        const storeInfo = {
          shop,
          email: shopDetails.data.shop.email,
          shopOwnerName: shopDetails.data.shop.shopOwnerName,
          ianaTimezone: shopDetails.data.shop.ianaTimezone,
          checkout_api_supported: shopDetails.data.shop.checkoutApiSupported,
          currencyCode: shopDetails.data.shop.currencyCode,
        };

        const sessionCredentials = await sessionModel.findOneAndUpdate(
          { shop },
          { shop, accessToken, scope },
          { upsert: true, new: true },
        );
        // console.log("Session updated:", sessionCredentials);

        const merchantData = await merchantInfoModel.findOneAndUpdate(
          { shop },
          storeInfo,
          { upsert: true , new: true},
        );
        // console.log("Merchant data updated:", merchantData);

        const billingInfo = await billingModel.findOneAndUpdate(
          { shop },
          {
            shop,
            trialPeriod: true,
            interval: "EVERY_30_DAYS",
            price: "0",
            plan: "FREE",
            charge_id: "",
            activated_on: new Date().toISOString().slice(0, 10),
          },
          { upsert: true, new: true },
        );
        // console.log("Billing info updated:", billingInfo);
        await Promise.all([
          sessionCredentials,
          merchantData,
          billingInfo,
        ]);

        console.log("✅ Installed Successfully!!");
      } catch (error) {
        console.log("Error in Installing", error);
        throw error;
      }
    },
  },
  webhooks: {
    APP_UNINSTALLED: {
      callbackUrl: "/webhooks",
      deliveryMethod: DeliveryMethod.Http,
    },

  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January26;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
