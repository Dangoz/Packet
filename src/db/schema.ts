import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const customBanners = sqliteTable('custom_banners', {
  poolId: text('pool_id').primaryKey(),
  imageUrl: text('image_url').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})
