# Future Upgrade: ValmontAI Action Assistant

> **Status:** Deferred future upgrade — not part of the current launch
>
> The current ValmontAI is a site-aware, deterministic assistant. It can search the public catalogue, explain known Valmont services, and direct visitors to the correct pages. It is not authorized to read private customer data or perform account and checkout actions.

## Vision

Build an authenticated assistant for customers who want ValmontAI to do most of the work for them. A customer should eventually be able to ask naturally for a product, compare options, view their own order status, add an item to their bag, and move into secure checkout.

The assistant must remain grounded in verified site data and must never invent prices, availability, policies, orders, or payment results.

## Required capabilities

### Secure identity

- Read the verified Supabase session
- Never trust an email address or user ID typed into chat
- Distinguish signed-out customers, signed-in customers, approved dealers, and administrators
- Keep administrative tools unavailable in the customer assistant

### Narrow backend tools

Potential read tools:

- `search_products`
- `get_product_details`
- `get_my_orders`
- `get_my_latest_order`
- `get_my_order_status`
- `get_my_addresses`
- `get_my_wishlist`
- `get_delivery_regions`
- `calculate_delivery`
- `get_installment_options`
- `get_my_dealer_status`
- `get_approved_dealer_prices`

Potential browser actions:

- `add_to_cart`
- `remove_from_cart`
- `open_cart`
- `apply_category_filter`
- `open_product`
- `start_checkout`
- `open_account`
- `open_swap_form`
- `open_wholesale_application`
- `open_valmontweb`

The assistant must not receive unrestricted database access. Private RPCs must derive identity from `auth.uid()` and return only the current customer's data.

## Centralized knowledge

Move changeable business information out of hardcoded chatbot rules and into an approved knowledge source managed by the admin system. It should cover:

- Warranty and return policies
- Delivery regions, prices, and free-delivery thresholds
- Installment requirements and schedules
- Daily Drop rules
- Swap & Sell safety guidance
- Partner and wholesale information
- ValmontWeb services
- Available and unavailable features
- Human-support escalation

Public product answers should continue to use the current public catalogue. Dealer prices must only come from authenticated dealer RPCs.

## Conversation context

The future assistant should safely remember the active conversation so it understands references such as:

- “Which one has the best battery?”
- “Add the second one.”
- “Where is my last order?”
- “Explain that option.”

Context should track the products currently being discussed, the active topic, the last proposed action, authentication state, and confirmation state. Sensitive data should not be retained unnecessarily.

## Generative AI layer

For natural, flexible language, use a server-side model provider with structured tool calling. The model should interpret requests and explain verified tool results; it must not be the authority for prices, stock, identity, payment, or order state.

A future provider requires:

- Server-side API credentials in hosting environment variables
- Usage and billing limits
- Per-user and per-IP rate limiting
- Input validation and output sanitization
- Prompt-injection defenses
- Timeouts and safe fallback behavior
- Moderation and abuse controls
- Redacted observability and a defined retention period

No provider key may be shipped to browser JavaScript.

## Backend endpoint

A likely interface is:

```text
POST /api/assistant/chat
Authorization: Bearer <verified Supabase access token when signed in>
```

The endpoint should:

1. Validate the message and conversation identifier.
2. Verify the optional Supabase access token.
3. Select only tools permitted for that identity.
4. execute narrow server-side tools.
5. Return a sanitized answer and approved UI actions.
6. Record operational metrics without unnecessarily storing private chat content.

## Confirmation policy

No confirmation should be needed to search products, show public information, open a page, or display the signed-in customer's own order status.

Explicit confirmation should be required before changing a cart, address, listing, application, or checkout state. Strong confirmation and the existing secure payment page are required for payment-related actions. The assistant must never independently mark an order paid, cancel an order, or change payment status.

## Interface upgrades

Future chat components may include:

- Product cards with current price and availability
- View product and Add to bag controls
- Private order-status cards
- Sign-in prompts
- Delivery quotes
- Confirmation controls
- Loading, retry, and error states
- Human-support escalation
- Conversation reset and deletion
- A concise privacy notice

## Recommended phases

### Phase 1 — deterministic actions, no external model

- Secure order lookup
- Live product search
- Product opening and Add to bag
- Delivery calculation
- Guided navigation
- Dealer-status lookup

### Phase 2 — generative understanding

Add a language model for natural intent detection and follow-up questions, while retaining the same verified tools and authorization boundaries.

### Phase 3 — admin-managed knowledge

Allow approved administrators to update policies, service descriptions, escalation responses, and assistant availability without editing JavaScript.

### Phase 4 — advanced guided workflows

- Rich order tracking
- Wishlist controls
- Guided checkout
- Swap-listing assistance
- Dealer and partner application guidance

## Decisions required before implementation

- AI provider, if any
- Maximum monthly model budget
- Exact actions the assistant may perform
- Conversation retention and deletion policy
- Human-support escalation process
- Final warranty, return, cancellation, and delivery policies
- Which actions require confirmation

## Principle

Build secure, useful tools before adding a conversational model. A fluent assistant without verified actions is still unable to help, while an unrestricted assistant creates privacy, authorization, and payment risks.
