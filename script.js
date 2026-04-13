let activePrefecture = null;
let selectedPrefectures = [];

const teamColors = {
  red: "#fc0000",
  orange: "#ff8000",
  yellow: "#f5dc3a",
  green: "#006633",
  blue: "#53b6f9",
  purple: "#990099",
  black: "#000000",
  white: "#ffffff"
};

window.addEventListener("DOMContentLoaded", () => {
  const prefectures = document.querySelectorAll("svg path[id]");
  const resetButton = document.getElementById("reset");
  const tooltip = document.getElementById("prefecture-tooltip");
  const radialMenu = document.getElementById("radial-menu");
  const radialOptions = Array.from(document.querySelectorAll(".radial-option"));
  const radialClear = document.getElementById("radial-clear");
  const radialBackdrop = document.querySelector(".radial-backdrop");
  const mapBg = document.querySelector(".map-bg");
  const selectionBox = document.getElementById("selection-box");

  let isDraggingSelection = false;
  let dragStarted = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let currentSelectionRect = null;
  let suppressNextDocumentClick = false;

  radialOptions.forEach((button, index) => {
    button.style.setProperty("--i", index);

    button.addEventListener("click", (e) => {
      e.stopPropagation();

      const color = button.dataset.color;

      if (selectedPrefectures.length > 0) {
        selectedPrefectures.forEach((prefecture) => {
          applyColorToPrefecture(prefecture, color);
        });
        clearDragSelectionHighlight();
        selectedPrefectures = [];
      } else {
        if (!activePrefecture) return;
        applyColorToPrefecture(activePrefecture, color);
      }

      resetSelectionState();
      updateScores(prefectures);
    });
  });

  if (radialClear) {
    radialClear.addEventListener("click", (e) => {
      e.stopPropagation();

      if (selectedPrefectures.length > 0) {
        selectedPrefectures.forEach((prefecture) => {
          clearPrefecture(prefecture);
        });
        clearDragSelectionHighlight();
        selectedPrefectures = [];
      } else {
        if (!activePrefecture) return;
        clearPrefecture(activePrefecture);
      }

      resetSelectionState();
      updateScores(prefectures);
    });
  }

  if (radialBackdrop) {
    radialBackdrop.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  prefectures.forEach((prefecture) => {
    prefecture.style.fill = "#ffffff";
    prefecture.style.fillOpacity = "0";
    prefecture.dataset.selectedColor = "";

    prefecture.addEventListener("click", (e) => {
      if (isDraggingSelection || dragStarted) return;

      e.stopPropagation();
      selectedPrefectures = [];
      activePrefecture = prefecture;

      clearSelectionHighlight();
      prefecture.classList.add("prefecture-selected");

      openRadialMenu(
        e.clientX,
        e.clientY,
        prefecture.dataset.selectedColor || ""
      );
    });

    prefecture.addEventListener("mouseenter", () => {
      if (!tooltip) return;
      tooltip.textContent = formatPrefectureName(prefecture.id);
      tooltip.style.display = "block";
    });

    prefecture.addEventListener("mousemove", (e) => {
      if (!tooltip) return;
      tooltip.style.left = `${e.clientX + 14}px`;
      tooltip.style.top = `${e.clientY + 14}px`;
    });

    prefecture.addEventListener("mouseleave", () => {
      if (!tooltip) return;
      tooltip.style.display = "none";
    });
  });

  if (mapBg && selectionBox) {
    mapBg.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      if (radialMenu && radialMenu.contains(e.target)) return;
      if (e.target.closest("button")) return;
      if (e.target.closest("path")) return;

      const mapRect = mapBg.getBoundingClientRect();

      dragStarted = true;
      isDraggingSelection = false;
      activePrefecture = null;
      selectedPrefectures = [];
      clearSelectionHighlight();
      closeRadialMenu();

      dragStartX = e.clientX - mapRect.left;
      dragStartY = e.clientY - mapRect.top;

      currentSelectionRect = {
        left: dragStartX,
        top: dragStartY,
        right: dragStartX,
        bottom: dragStartY
      };
    });

    window.addEventListener("pointermove", (e) => {
      if (!dragStarted) return;

      const mapRect = mapBg.getBoundingClientRect();
      const currentX = e.clientX - mapRect.left;
      const currentY = e.clientY - mapRect.top;
      const dragDistance = Math.hypot(currentX - dragStartX, currentY - dragStartY);

      if (!isDraggingSelection && dragDistance > 6) {
        isDraggingSelection = true;
        selectionBox.style.display = "block";
      }

      if (!isDraggingSelection) return;

      const left = Math.min(dragStartX, currentX);
      const top = Math.min(dragStartY, currentY);
      const width = Math.abs(currentX - dragStartX);
      const height = Math.abs(currentY - dragStartY);

      selectionBox.style.left = `${left}px`;
      selectionBox.style.top = `${top}px`;
      selectionBox.style.width = `${width}px`;
      selectionBox.style.height = `${height}px`;

      currentSelectionRect = {
        left,
        top,
        right: left + width,
        bottom: top + height
      };

      const liveSelected = getPrefecturesInRect(currentSelectionRect, mapRect, prefectures);
      applySelectionHighlight(liveSelected);
    });

    window.addEventListener("pointerup", (e) => {
      if (!dragStarted) return;

      const wasDraggingSelection = isDraggingSelection;
      const finalRect = currentSelectionRect;

      dragStarted = false;
      isDraggingSelection = false;
      currentSelectionRect = null;
      selectionBox.style.display = "none";

      if (!wasDraggingSelection || !finalRect) return;

      const mapRect = mapBg.getBoundingClientRect();
      selectedPrefectures = getPrefecturesInRect(finalRect, mapRect, prefectures);

      applySelectionHighlight(selectedPrefectures);

      if (selectedPrefectures.length > 0) {
        activePrefecture = null;
        suppressNextDocumentClick = true;
        openRadialMenu(e.clientX, e.clientY, "");
      }
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      prefectures.forEach((prefecture) => {
        clearPrefecture(prefecture);
        prefecture.classList.remove("drag-selected");
      });

      resetSelectionState();
      updateScores(prefectures);
    });
  }

  document.addEventListener("click", (e) => {
    if (suppressNextDocumentClick) {
      suppressNextDocumentClick = false;
      return;
    }

    if (!radialMenu || !radialMenu.classList.contains("open")) return;
    if (!radialMenu.contains(e.target)) {
      closeRadialMenu();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeRadialMenu();
    }
  });

  updateScores(prefectures);

  function getPrefecturesInRect(selectionRect, mapRect, prefectureList) {
    return Array.from(prefectureList).filter((prefecture) => {
      const rect = prefecture.getBoundingClientRect();

      const relativeRect = {
        left: rect.left - mapRect.left,
        top: rect.top - mapRect.top,
        right: rect.right - mapRect.left,
        bottom: rect.bottom - mapRect.top
      };

      return !(
        relativeRect.right < selectionRect.left ||
        relativeRect.left > selectionRect.right ||
        relativeRect.bottom < selectionRect.top ||
        relativeRect.top > selectionRect.bottom
      );
    });
  }

  function resetSelectionState() {
    closeRadialMenu();
    clearSelectionHighlight();
    selectedPrefectures = [];
    activePrefecture = null;
  }

  function openRadialMenu(clientX, clientY, selectedColor) {
    if (!radialMenu) return;

    highlightCurrentRadialColor(selectedColor);

    const menuSize = 210;
    const padding = 16;

    let x = clientX;
    let y = clientY;

    if (x < menuSize / 2 + padding) x = menuSize / 2 + padding;
    if (y < menuSize / 2 + padding) y = menuSize / 2 + padding;
    if (x > window.innerWidth - menuSize / 2 - padding) {
      x = window.innerWidth - menuSize / 2 - padding;
    }
    if (y > window.innerHeight - menuSize / 2 - padding) {
      y = window.innerHeight - menuSize / 2 - padding;
    }

    radialMenu.style.left = `${x}px`;
    radialMenu.style.top = `${y}px`;
    radialMenu.classList.add("open");
    radialMenu.setAttribute("aria-hidden", "false");
  }

  function closeRadialMenu() {
    if (!radialMenu) return;
    radialMenu.classList.remove("open");
    radialMenu.setAttribute("aria-hidden", "true");
    highlightCurrentRadialColor("");
  }

  function highlightCurrentRadialColor(selectedColor) {
    radialOptions.forEach((button) => {
      const isActive = selectedColor && button.dataset.color === selectedColor;
      button.classList.toggle("active-color", isActive);
    });
  }

  function applyColorToPrefecture(prefecture, color) {
    prefecture.style.fill = color;
    prefecture.style.fillOpacity = "0.55";
    prefecture.dataset.selectedColor = color;
  }

  function clearPrefecture(prefecture) {
    prefecture.style.fill = "transparent";
    prefecture.style.fillOpacity = "1";
    prefecture.dataset.selectedColor = "";
    prefecture.classList.remove("drag-selected");
    prefecture.style.stroke = "transparent";
    prefecture.style.strokeWidth = "0";
  }

  function formatPrefectureName(id) {
    return id.replace(/^\d+-/, "");
  }

  function clearSelectionHighlight() {
    prefectures.forEach((prefecture) => {
      prefecture.classList.remove("prefecture-selected");
    });
  }

  function clearDragSelectionHighlight() {
    selectedPrefectures.forEach((prefecture) => {
      prefecture.classList.remove("drag-selected");
    });
  }

  function applySelectionHighlight(prefectureList) {
    clearSelectionHighlight();
    prefectureList.forEach((prefecture) => {
      prefecture.classList.add("prefecture-selected");
    });
  }

  function updateScores(prefectureList) {
    const counts = {
      red: 0,
      orange: 0,
      yellow: 0,
      green: 0,
      blue: 0,
      purple: 0,
      black: 0,
      white: 0
    };

    prefectureList.forEach((prefecture) => {
      const selectedColor = prefecture.dataset.selectedColor;
      const teamName = Object.keys(teamColors).find(
        (key) => teamColors[key] === selectedColor
      );

      if (teamName) counts[teamName]++;
    });

    document.getElementById("red-score").textContent = counts.red;
    document.getElementById("orange-score").textContent = counts.orange;
    document.getElementById("yellow-score").textContent = counts.yellow;
    document.getElementById("green-score").textContent = counts.green;
    document.getElementById("blue-score").textContent = counts.blue;
    document.getElementById("purple-score").textContent = counts.purple;
    document.getElementById("black-score").textContent = counts.black;
    document.getElementById("white-score").textContent = counts.white;
  }
});