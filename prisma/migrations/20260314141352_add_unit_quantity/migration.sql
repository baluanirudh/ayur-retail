-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InventoryItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productCode" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "unitQuantity" REAL NOT NULL DEFAULT 0,
    "gst" REAL NOT NULL,
    "basicPrice" REAL NOT NULL,
    "mrp" REAL NOT NULL,
    "quantity" REAL NOT NULL,
    "ounce" REAL,
    "expiry" DATETIME NOT NULL,
    "itemPosition" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_InventoryItem" ("basicPrice", "createdAt", "expiry", "gst", "id", "isActive", "itemPosition", "medicineName", "mrp", "ounce", "productCode", "quantity", "unit", "updatedAt") SELECT "basicPrice", "createdAt", "expiry", "gst", "id", "isActive", "itemPosition", "medicineName", "mrp", "ounce", "productCode", "quantity", "unit", "updatedAt" FROM "InventoryItem";
DROP TABLE "InventoryItem";
ALTER TABLE "new_InventoryItem" RENAME TO "InventoryItem";
CREATE UNIQUE INDEX "InventoryItem_productCode_key" ON "InventoryItem"("productCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
