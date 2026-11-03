"use client";

import { Suspense } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import CheckHeader from "./components/CheckHeader";
import ProductCard from "./components/ProductCard";
import CheckQuestion from "./components/CheckQuestion";
import CheckActions from "./components/CheckActions";
import CheckStates from "./components/CheckStates";
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
        categoryId={categoryId}
        loading={categoriesLoading}
        error={error}
        onChange={changeCategory}
      />
    );
  }

  if (loading) {
    return <CheckStates state="loading" />;
  }

  if (blocked) {
    return <CheckStates state="error" error={blocked} />;
  }

  if (error && items.length === 0 && initialCount === 0) {
    return <CheckStates state="error" error={error} />;
  }

  if (!currentItem) {
    return (
      <CheckStates
        state="completed"
        description={
          isStock && categoryId === "all"
            ? "Alle producten zonder stock zijn gecontroleerd."
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

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <CheckHeader
          title={config.title}
          type={type}
          categoryName={isStock ? selectedCategory?.name : undefined}
          remainingCount={items.length}
          completedCount={completedCount}
          initialCount={initialCount}
          progressPercent={progressPercent}
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
              isPickupQuestion={isEvening}
              showDateInput={showDateInput}
              nextExpiryDate={nextExpiryDate}
              todayString={minimumExpiryDate}
              saving={saving}
              onDateChange={setNextExpiryDate}
            />

            {canSwipe && (
              <div className={styles.swipeHint}>
                {isEvening ? (
                  <>
                    <span>Swipe naar rechts: opgehaald of al verkocht</span>
                    <ArrowRight size={15} />
                  </>
                ) : (
                  <>
                    <ArrowLeft size={15} />
                    <span>
                      {isStickerQuestion ? "Niet aanwezig" : "Geen voorraad"}
                    </span>
                    <span className={styles.swipeDivider}>·</span>
                    <span>Swipe</span>
                    <span className={styles.swipeDivider}>·</span>
                    <span>
                      {isStickerQuestion ? "Gestickerd" : "Wel voorraad"}
                    </span>
                    <ArrowRight size={15} />
                  </>
                )}
              </div>
            )}
          </ProductCard>
        </div>

        <CheckActions
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
