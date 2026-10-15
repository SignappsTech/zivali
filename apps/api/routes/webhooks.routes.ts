// /v1/webhooks (C13): provider callbacks, no JWT. Mounted in app.ts before express.json, because the Stripe signature
// covers the exact raw bytes. Not in the OpenAPI document: no client calls it. Wiring only.
import express, { Router } from 'express';

import WebhooksController from '../controllers/webhooks.controller.ts';

const router = Router();

router.post('/stripe', express.raw({ type: () => true, limit: '256kb' }), WebhooksController.stripe);

export default router;
