-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medicalCondition" TEXT,
    "dietType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "labelText" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "ingredients" TEXT[],
    "genericFindings" JSONB NOT NULL,
    "genericScore" INTEGER NOT NULL,
    "genericRating" TEXT NOT NULL,
    "genericVerdict" TEXT NOT NULL,
    "genericQuickTake" TEXT NOT NULL,
    "personalizedScore" INTEGER,
    "personalizedRating" TEXT,
    "personalizedVerdict" TEXT,
    "profileMatches" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanAlternative" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "alternatives" JSONB NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScanAlternative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExposureAggregate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "window" TEXT NOT NULL,
    "hiddenSugarGrams" INTEGER NOT NULL,
    "ultraProcessedCount" INTEGER NOT NULL,
    "allergenFlagCount" INTEGER NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExposureAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "HealthProfile_userId_key" ON "HealthProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ScanAlternative_scanId_key" ON "ScanAlternative"("scanId");

-- CreateIndex
CREATE UNIQUE INDEX "ExposureAggregate_userId_window_key" ON "ExposureAggregate"("userId", "window");

-- AddForeignKey
ALTER TABLE "HealthProfile" ADD CONSTRAINT "HealthProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanAlternative" ADD CONSTRAINT "ScanAlternative_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExposureAggregate" ADD CONSTRAINT "ExposureAggregate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
