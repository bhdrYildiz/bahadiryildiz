(() => {
  const STORAGE_KEY = "seesaw-simulation-state";
  const DEFAULT_STATE = {
    objects: [],
    totals: { left: 0, right: 0 },
    angle: 0,
    log: [],
    //sıradaki ağırlığı ekledim.
    nextWeight: null
  };

  //sayfa açılınca yüklenen verileri yükleme varsa (localStorageden) yoksa default değerler okunur.
  let state = loadState();

  //sıradaki ağırlığı ekledim.
  if (typeof state.nextWeight !== "number") {
    state.nextWeight = getRandomWeight();
  }
  state.totals.left = 0;
  state.totals.right = 0;
  state.objects.forEach((object) => {
    if (object.side === "left") {
      state.totals.left += object.weight;
    } else {
      state.totals.right += object.weight;
    }
  });

  //html elemanlarını tek bir nesnede topladım.
  //her defasında DOM araması yapmak yerine tek bir nesne ile erişim sağladım.
  const elements = {
    plank: document.getElementById("seesaw-plank"),
    resetButton: document.getElementById("reset-button"),
    leftWeight: document.getElementById("left-weight"),
    nextWeight: document.getElementById("next-weight"),
    rightWeight: document.getElementById("right-weight"),
    tiltAngle: document.getElementById("tilt-angle"),
    logList: document.getElementById("log-list")
  };

  initialize();

  function initialize() {
    renderAll();
    elements.plank.addEventListener("click", handlePlankClick);
    elements.resetButton.addEventListener("click", handleReset);
  }

  function handlePlankClick(event) {
    //tahterevallinin ekrandaki konum bilgisi alınır.//tıklamanın nereye düştüğünü hesaplamak için gerekli. 
    const bounds = elements.plank.getBoundingClientRect();
    //event.clientX: ekranın solundan ölçülen x koordinatı.
    const clickX = event.clientX - bounds.left;
    const halfWidth = bounds.width / 2;
    const distanceFromCenter = clickX - halfWidth;
    //uzaklık negatifse sol, pozitifse sağ taraf , ilerde hangi tarafa düştüğnü kullanmak için.
    const side = distanceFromCenter < 0 ? "left" : "right";

    //sıradaki ağırlığı alıyorum.
    const weight = state.nextWeight;
    const normalizedPosition = valueRange(clickX / bounds.width, 0, 1);

    state.objects.push({
      id: createObjectId(),
      weight,
      side,
      distanceX: distanceFromCenter,
      position: normalizedPosition
    });

    if (side === "left") {
      state.totals.left += weight;
    } else {
      state.totals.right += weight;
    }

    addLogMesasge(
      `${weight}kg ağırlık ${
        side === "left" ? "sol" : "sağ"
      } tarafa bırakıldı (merkezden ${Math.abs(Math.round(distanceFromCenter))}px)`
    );

    let leftTorque = 0;
    let rightTorque = 0;

    //tork hesaplamaları için fonksiyon.
    state.objects.forEach((object) => {
      const distance = Math.abs(object.distanceX);
      const torque = object.weight * distance;

      if (object.side === "left") {
        leftTorque += torque;
      } else {
        rightTorque += torque;
      }
    });

    const rawAngle = (rightTorque - leftTorque) / 100;
    state.angle = Math.max(-30, Math.min(30, rawAngle));
    state.nextWeight = getRandomWeight();
    saveState();
    renderAll();
  }

  function handleReset() {
    state = structuredClone(DEFAULT_STATE);
    state.nextWeight = getRandomWeight();
    state.totals.left = 0;
    state.totals.right = 0;
    state.angle = 0;
    //yeni durum localStorage e kaydedilir.
    saveState();
    //ekranı yeniden oluşturmak için.
    renderAll();
    addLogMesasge("Simülasyon sıfırlandı.");
  }

  // tüm ui bileşeni sıfırlanır.
  function renderAll() {
    renderStatus();
    //ağırlıkların ekranın konumları güncellenir.
    renderObjects();
    //log listesi güncellenir.
    renderLog();
  }

  function renderStatus() {
    //tork hesaplamaları için (mesafe x ağırlık toplamı küsürat olmasın diye 1 ondalık basamağa yuvarlayıp 
    // elementlere yazdırıyorum. 
    elements.leftWeight.textContent = `${state.totals.left.toFixed(1)} kg`;
    elements.nextWeight.textContent = `${state.nextWeight} kg`;
    elements.rightWeight.textContent = `${state.totals.right.toFixed(1)} kg`;
    elements.tiltAngle.textContent = `${state.angle.toFixed(1)}°`;
    elements.plank.style.transform = `rotate(${state.angle}deg)`;
  }

  function renderObjects() {
    //varsa eski ağırlıkları silmek için.
    removeExistingObjects();
    state.objects.forEach((object) => {
      //yeni ağırlıklar oluşturmak için div oluşturuulup class ve data-side eklenir.
      const objectNode = document.createElement("div");
      objectNode.className = "seesaw-object";
      objectNode.dataset.side = object.side; // sol taraf mı sağ taraf mı
      objectNode.textContent = `${object.weight}kg`; // kaç kg olduğu 
      objectNode.style.left = `${object.position * 100}%`; // merkezden ne kadar uzakta olduğu hepsalanacak daha sornarsı için. 
      elements.plank.appendChild(objectNode);
    });
  }

  function renderLog() {
    elements.logList.innerHTML = "";
    state.log.forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = entry;
      elements.logList.appendChild(item);
    });
  }

  function addLogMesasge(message) {
    //log a ekkleme yapıyorum. ilk index oalrak.
    state.log.unshift(message);
    state.log = state.log.slice(0, 20);
    saveState();
    renderLog();
  }

  function removeExistingObjects() {
    elements.plank
      .querySelectorAll(".seesaw-object")
      .forEach((node) => node.remove());
  }

  function getRandomWeight() {
    return Math.floor(Math.random() * 20) + 1; // 1-20 arası rastgele bir ağırlık oluturuluyor
  }
  //value: 0-1 arası bir değer, min: 0, max: 1 tahterevallinin genişliğine göre.
  function valueRange(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }


  function createObjectId() {
    return `obj-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  //localStorage'den kayıt okunuyor, yoksa DEFAULT_STATE ile başlanır.(klonlanıyor)
  function loadState() {
    try {
    //önceki oturumda kaydedilmiş JSON string’i geri alıyoruz. Eğer hiç veri yoksa null döner.
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return structuredClone(DEFAULT_STATE);
      }
      const parsed = JSON.parse(stored);
      return {
        objects: Array.isArray(parsed.objects) ? parsed.objects : [],
        totals: parsed.totals ?? structuredClone(DEFAULT_STATE.totals),
        angle: typeof parsed.angle === "number" ? parsed.angle : 0,
        log: Array.isArray(parsed.log) ? parsed.log : [],
        //sıradaki ağırlığı ekledim.
        nextWeight:
          typeof parsed.nextWeight === "number" ? parsed.nextWeight : null
      };
    } catch (error) {
      console.warn("Yerel depolama okunamadı:", error);
      return structuredClone(DEFAULT_STATE);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Yerel depolama yazılamadı:", error);
    }
  }
})();

