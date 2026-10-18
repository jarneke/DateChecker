"use client";

import { Suspense, useMemo } from "react";
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
  const workflow = useCheckWorkflow();

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
    initialCount,
    completedCount,
    progressPercent,
    dailyStep,
    showDateInput,
    nextExpiryDate,
    todayString,
    swipeOffset,
    missedCheck,
    isEvening,
    isStock,
    isStickerQuestion,
    canSwipe,
    changeCategory,
    setNextExpiryDate,
    setShowDateInput,
    handleChecked,
    handleEveningNext,
    handleYes,
    handleNo,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  } = workflow;

  const editReturnUrl = useMemo(() => {
    if (!type) return "/";

    const params = new URLSearchParams({
      type,
      refresh: String(Date.now()),
    });

    if (type === "stock" && categoryId) {
      params.set("categoryId", categoryId);
    }

    return `/check?${params.toString()}`;
  }, [type, categoryId]);

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

  if (error && items.length === 0) {
    return <CheckStates state="error" error={error} />;
  }

  if (!currentItem) {
    return (
      <CheckStates
        state="completed"
        description={config.emptyDescription}
        isStock={isStock}
        onChangeCategory={() => changeCategory("")}
      />
    );
  }

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
              expiryDate={currentItem.expiry_date}
              showDateInput={showDateInput}
              nextExpiryDate={nextExpiryDate}
              todayString={todayString}
              saving={saving}
              onDateChange={setNextExpiryDate}
            />

            {canSwipe && (
              <div className={styles.swipeHint}>
                <ArrowLeft size={15} />
                <span>Nee</span>
                <span className={styles.swipeDivider}>·</span>
                <span>Swipe</span>
                <span className={styles.swipeDivider}>·</span>
                <span>Ja</span>
                <ArrowRight size={15} />
              </div>
            )}
          </ProductCard>
        </div>

        <CheckActions
          isEvening={isEvening}
          showDateInput={!isStickerQuestion && showDateInput}
          nextExpiryDate={nextExpiryDate}
          todayString={todayString}
          saving={saving}
          onYes={handleYes}
          onNo={handleNo}
          onSaveDate={() => void handleChecked()}
          onEveningNext={() => void handleEveningNext()}
          onBack={() => {
            setShowDateInput(false);
            setNextExpiryDate("");
          }}
        />
      </div>
    </main>
  );
}

function CheckPageFallback() {
  return <CheckStates state="loading" />;
}

export default function CheckPage() {
  return (
    <Suspense fallback={<CheckPageFallback />}>
      <CheckContent />
    </Suspense>
  );
}
