-- CreateIndex
CREATE INDEX "AccessToken_userId_idx" ON "AccessToken"("userId");

-- CreateIndex
CREATE INDEX "RssSubscription_collectionId_idx" ON "RssSubscription"("collectionId");

-- CreateIndex
CREATE INDEX "RssSubscription_ownerId_idx" ON "RssSubscription"("ownerId");

-- CreateIndex
CREATE INDEX "Highlight_linkId_idx" ON "Highlight"("linkId");

-- CreateIndex
CREATE INDEX "Highlight_userId_idx" ON "Highlight"("userId");

-- CreateIndex
CREATE INDEX "DashboardSection_userId_idx" ON "DashboardSection"("userId");

-- CreateIndex
CREATE INDEX "DashboardSection_collectionId_idx" ON "DashboardSection"("collectionId");
