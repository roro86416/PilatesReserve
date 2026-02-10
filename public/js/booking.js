(function () {
  const $date = document.getElementById("date");
  const $btnLoad = document.getElementById("btnLoad");
  const $list = document.getElementById("coachList");
  const $msg = document.getElementById("msg");
  const $modal = document.getElementById("confirmModal");
  const $confirmText = document.getElementById("confirmText");
  const $btnDoBook = document.getElementById("btnDoBook");

  const today = new Date().toISOString().slice(0, 10);
  $date.value = today;

  let pending = null; // {coach_id, coach_name, date, time, btn}

  $btnLoad.addEventListener("click", loadAll);
  loadAll(); // 初次載入

  async function loadAll() {
    $msg.textContent = "";
    $list.innerHTML = "";
    const date = $date.value;

    for (const c of window.COACHES || []) {
      // 卡片骨架
      const card = document.createElement("div");
      card.className = "card card-side bg-base-100 shadow-xl";
      card.innerHTML = `
        <figure class="w-40 h-40 shrink-0 bg-base-300">
          <img src="${c.img}" alt="${c.name}" class="w-full h-full object-cover" onerror="this.src='/img/coaches/placeholder.jpg'"/>
        </figure>
        <div class="card-body">
          <h2 class="card-title">${c.name}</h2>
          <div class="flex flex-wrap gap-2" id="slots-${c.id}">
            <div class="text-base-content/60">載入中…</div>
          </div>
        </div>`;
      $list.appendChild(card);

      // 取時段
      try {
        const url = `/reserve/booking?date=${encodeURIComponent(
          date
        )}&coach_id=${c.id}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error("查詢失敗");
        const { slots } = await r.json();
        renderSlots(c, slots);
      } catch (e) {
        const box = card.querySelector(`#slots-${c.id}`);
        box.innerHTML = `<span class="text-error">載入失敗</span>`;
        console.error(e);
      }
    }
  }

  function renderSlots(coach, slots) {
    const box = document.getElementById(`slots-${coach.id}`);
    box.innerHTML = "";
    if (!slots?.length) {
      box.innerHTML = `<span class="text-base-content/60">本日無時段</span>`;
      return;
    }
    for (const s of slots) {
      const btn = document.createElement("button");
      btn.className = "btn btn-sm";
      btn.textContent = s.time;
      if (!s.available) {
        btn.disabled = true;
        btn.classList.add("btn-disabled");
        btn.title = "已被預約";
      } else {
        btn.classList.add("btn-warning"); // 橘色風格
        btn.addEventListener("click", () => onPick(coach, s.time, btn));
      }
      box.appendChild(btn);
    }
  }

  function onPick(coach, time, btn) {
    pending = {
      coach_id: coach.id,
      coach_name: coach.name,
      date: $date.value,
      time,
      btn,
    };
    $confirmText.textContent = `確認預約：${pending.date}・${pending.coach_name}・${pending.time}`;
    $modal.showModal();
  }

  $btnDoBook.addEventListener("click", bookNow);

  async function bookNow() {
    if (!pending) return;
    try {
      const r = await fetch("/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coach_id: pending.coach_id,
          member_id: 1, // 之後接登入替換
          date: pending.date,
          start_time: pending.time,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 409) {
          alert("此時段剛被預約了"); // 顯示衝突
          await loadAll(); // 立即重載，按鈕會變 disabled
        } else {
          alert(data?.error || "預約失敗");
        }
        return;
      }

      window.addEventListener("focus", loadAll);

      // 成功：按鈕禁用並刷新提示
      pending.btn.disabled = true;
      pending.btn.classList.remove("btn-warning");
      pending.btn.classList.add("btn-disabled");
      $msg.textContent = "預約成功";
    } catch (e) {
      alert("網路錯誤");
      console.error(e);
    } finally {
      pending = null;
      $modal.close();
    }
  }
})();
