import { Router } from 'express';
import { CollectionsController } from './collections.controller';

const router = Router();

// PHP Collections compatibility endpoints
router.all('/handle_collection/:key', CollectionsController.handleCollection);
router.all('/handle_collection_by_id/:key/:id', CollectionsController.handleCollectionById);

// General collections
router.get('/:name', CollectionsController.getCollection);
router.post('/:name', CollectionsController.saveCollection);

export const collectionsRoutes = router;
