/** Admin API (2026-10) GraphQL used by the server. Each was validated against the live store's schema. */

export const NS = 'b2b_app';

export const CUSTOMER_FIELDS = `
  id firstName lastName tags numberOfOrders
  amountSpent { amount }
  defaultPhoneNumber { phoneNumber }
  defaultEmailAddress { emailAddress }
  defaultAddress { id address1 address2 city zip province provinceCode phone }
  metafields(namespace: "${NS}", first: 20) { nodes { key value } }`;

export const FIND_CUSTOMER_BY_PHONE = `query FindByPhone($q: String!) {
  customers(first: 2, query: $q) { nodes { ${CUSTOMER_FIELDS} } }
}`;

export const GET_CUSTOMER = `query GetCustomer($id: ID!) { customer(id: $id) { ${CUSTOMER_FIELDS} } }`;

export const CREATE_CUSTOMER = `mutation CreateCustomer($input: CustomerInput!) {
  customerCreate(input: $input) { customer { ${CUSTOMER_FIELDS} } userErrors { field message } }
}`;

export const UPDATE_CUSTOMER = `mutation UpdateCustomer($input: CustomerInput!) {
  customerUpdate(input: $input) { customer { ${CUSTOMER_FIELDS} } userErrors { field message } }
}`;

export const SET_METAFIELDS = `mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) { metafields { key } userErrors { field message } }
}`;

export const DELETE_METAFIELDS = `mutation DeleteMetafields($metafields: [MetafieldIdentifierInput!]!) {
  metafieldsDelete(metafields: $metafields) { deletedMetafields { key } userErrors { field message } }
}`;

export const ADDRESS_CREATE = `mutation AddressCreate($customerId: ID!, $address: MailingAddressInput!) {
  customerAddressCreate(customerId: $customerId, address: $address, setAsDefault: true) { address { id } userErrors { field message } }
}`;

export const ADDRESS_UPDATE = `mutation AddressUpdate($customerId: ID!, $addressId: ID!, $address: MailingAddressInput!) {
  customerAddressUpdate(customerId: $customerId, addressId: $addressId, address: $address, setAsDefault: true) { address { id } userErrors { field message } }
}`;

const ORDER_SUMMARY_FIELDS = `
  id name createdAt cancelledAt displayFinancialStatus displayFulfillmentStatus
  currentSubtotalLineItemsQuantity
  currentTotalPriceSet { shopMoney { amount } }
  lineItems(first: 100) { nodes { image { url } quantity variantTitle } }
  fulfillments(first: 5) { status displayStatus deliveredAt inTransitAt createdAt }`;

export const CUSTOMER_ORDERS = `query CustomerOrders($id: ID!) {
  customer(id: $id) { orders(first: 50, sortKey: CREATED_AT, reverse: true) { nodes { ${ORDER_SUMMARY_FIELDS} customer { id } } } }
}`;

export const ORDER_DETAIL = `query OrderDetail($id: ID!) {
  order(id: $id) {
    ${ORDER_SUMMARY_FIELDS}
    customer { id }
    statusPageUrl paymentGatewayNames processedAt
    totalOutstandingSet { shopMoney { amount } }
    shippingAddress { address1 city zip province }
    detailLines: lineItems(first: 100) { nodes { name title variantTitle quantity image { url } originalTotalSet { shopMoney { amount } } variant { id product { handle } } } }
    fulfillments(first: 5) { status displayStatus createdAt inTransitAt deliveredAt trackingInfo(first: 3) { company number url } }
  }
}`;

export const APP_SETTINGS = `query AppSettings {
  metaobjects(type: "b2b_app_settings", first: 1) { nodes { fields { key value } } }
}`;

export const ORDER_FOR_ALERT = `query OrderForAlert($id: ID!) {
  order(id: $id) { name cancelledAt displayFulfillmentStatus fulfillments(first: 5) { status displayStatus createdAt inTransitAt deliveredAt } customer { id metafield(namespace: "${NS}", key: "push_tokens") { value } } }
}`;
