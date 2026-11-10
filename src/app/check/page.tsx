"use client";

import { Suspense } from "react";

import CheckHeader from "./components/CheckHeader";
import ProductCard from "./components/ProductCard";
import CheckQuestion from "./components/CheckQuestion";
import CheckActions from "./components/CheckActions";
import CheckStates from "./components/CheckStates";
import CheckSwipeHint from "./components/CheckSwipeHint";
import CategorySelector from "./components/CategorySelector";

import { useCheckWorkflow } from "./hooks/useCheckWorkflow";
import styles from "./page.module.css";

function CheckContent() {
  const {
    type,
    config,
    items,
    categories,
    categoryId,
    selectedCategory,
    currentItem,
    loading,
    categoriesLoading,
    saving,
    error,
    blocked,
    initialCount,
    completedCount,
    progressPercent,
    dailyStep,
    showDateInput,
    nextExpiryDate,
    minimumExpiryDate,
    swipeOffset,
    missedCheck,
    isEvening,
    isStock,
    isStickerQuestion,
    canSwipe,
    canGoBack,
    changeCategory,
    setNextExpiryDate,
    handleChecked,
    handleEveningNext,
    handleBack,
    handleYes,
    handleNo,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  } = useCheckWorkflow();

  if (!type || !config) {
    return <CheckStates state="invalid" />;
  }

  if (isStock && !categoryId) {
    return (
      <CategorySelector
        categories={categories}
        loading={categoriesLoading}
        error={error}
      />
    );
  }

  if (loading) {
    return <CheckStates state="loading" />;
  }

  if (blocked) {
    return <CheckStates state="error" error={blocked} />;
  }

  if (error && items.length === 0) {
    return <CheckStates state="error" error={error} />;
  }

  if (!currentItem) {
    return (
      <CheckStates
        state="completed"
        description={
          isStock && categoryId === "all"
            ? "Alle producten zonder geregistreerde voorraad zijn gecontroleerd."
            : config.emptyDescription
        }
        error={error}
        isStock={isStock}
        saving={saving}
        canGoBack={canGoBack}
        onBack={() => void handleBack()}
        onChangeCategory={() => changeCategory("")}
      />
    );
  }

  const returnParams = new URLSearchParams({ type });

  if (isStock && categoryId) {
    returnParams.set("categoryId", categoryId);
  }

  const editReturnUrl = `/check?${returnParams.toString()}`;
  const stickerNoLabel =
    type === "monthly" ? "Niet gestickerd" : "Niet aanwezig";

  const swipeLeftText = isEvening
    ? undefined
    : isStickerQuestion
      ? stickerNoLabel
      : "Geen voorraad";

  const swipeRightText = isEvening
    ? "Opgehaald of verkocht"
    : isStickerQuestion
      ? "Gestickerd"
      : "Vervaldatum invullen";

  const remainingCount = Math.max(items.length, initialCount - completedCount);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <CheckHeader
          title={config.title}
          type={type}
          categoryName={isStock ? selectedCategory?.name : undefined}
          remainingCount={remainingCount}
          completedCount={completedCount}
          initialCount={initialCount}
          progressPercent={progressPercent}
          progressLabel={
            type === "monthly-pickup" ? "Voorraad bijgewerkt" : undefined
          }
          saving={saving}
          onChangeCategory={() => changeCategory("")}
        />

        <div
          className={styles.checkBody}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          <ProductCard
            key={currentItem.id}
            item={currentItem}
            type={type}
            missedCheck={missedCheck}
            editReturnUrl={editReturnUrl}
            swipeOffset={swipeOffset}
          >
            {error && (
              <p className={styles.checkError} role="alert">
                {error}
              </p>
            )}

            <CheckQuestion
              type={type}
              dailyStep={dailyStep}
              expiryDate={
                currentItem.target_expiry_date ?? currentItem.expiry_date
              }
              stickered={currentItem.stickered}
              isPickupQuestion={isEvening}
              showDateInput={showDateInput}
              nextExpiryDate={nextExpiryDate}
              todayString={minimumExpiryDate}
              saving={saving}
              onDateChange={setNextExpiryDate}
            />

            {canSwipe && (
              <CheckSwipeHint
                swipeLeftText={swipeLeftText}
                swipeRightText={swipeRightText}
              />
            )}
          </ProductCard>
        </div>

        <CheckActions
          type={type}
          isEvening={isEvening}
          isStickerQuestion={isStickerQuestion}
          showDateInput={showDateInput}
          nextExpiryDate={nextExpiryDate}
          todayString={minimumExpiryDate}
          saving={saving}
          canGoBack={canGoBack}
          onYes={handleYes}
          onNo={handleNo}
          onSaveDate={() => void handleChecked()}
          onEveningNext={() => void handleEveningNext()}
          onBack={() => void handleBack()}
        />
      </div>
    </main>
  );
}

export default function CheckPage() {
  return (
    <Suspense fallback={<CheckStates state="loading" />}>
      <CheckContent />
    </Suspense>
  );
}
