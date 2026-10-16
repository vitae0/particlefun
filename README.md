# ParticleFun

**Parçacık, dalga paketi ve kuantum alanı görünümü arasında simülasyon durmadan geçiş yapılabilen, tarayıcı tabanlı fizik laboratuvarı.**

Bu depo sıfır bağımlılıkla çalışan bir ES module uygulamasıdır. Bütün fiziksel sayılar SI birimleriyle hesaplanır; ekran nanometre (nm), femtosaniye (fs), elektronvolt (eV) ve km/s gösterir. Hesaplar, verilen modelin **gerçek denklemlerine** dayanır. Modelin kendisi kasıtlı olarak sınırlıdır. **Bu program ne eksiksiz atom fiziği ne de kuantum elektrodinamiği (QED) simülatörüdür.**

## Çalıştırma

```bash
git clone https://github.com/vitae0/particlefun.git
cd particlefun
python3 -m http.server 8080
# http://localhost:8080
```

Doğrudan `index.html` dosyasını `file://` protokolüyle açmayın; tarayıcı ES modules için HTTP sunucusu isteyebilir.

Node.js 20+ ile test:

```bash
npm test
```

Build komutu, CDN veya API anahtarı gerekmez. Statik hosting ve GitHub Pages ile uyumludur.

## Kullanım

1. Soldan **elektron, pozitron, proton, nötron, müon veya alfa çekirdeği** seçin; konum ve iki hız bileşenini girip ekleyin. Alternatif olarak tuvale tıklayarak yerleştirme modunu açın.
2. Simülasyon çalışırken **Parçacık / Dalga / Kuantum alanı** görünümüne geçin. Görünüm değişimi fiziksel durumu sıfırlamaz.
3. Tuvaldeki parçacığa veya sağdaki listesine tıklayarak hızını, kinetik enerjisini, de Broglie dalga boyunu ve paket genişliğini izleyin; hız bileşenlerini değiştirip **Hızı uygula** düğmesine basın.
4. `B_z`, Coulomb yumuşatma uzunluğu ve başlangıç dalga paketi genişliğini değiştirin; hazır deneylerle başlayın. **0.25 fs** düğmesi tek-adım kontrolü sağlar.
5. Yüklü parçacıklar arasında çekim/itme ilişkileri ile elektrik alan vektörleri görülebilir. Parçacık hareketi görünür alan sınırının dışına çıkabilir. **Görünmez duvarlar veya sahte yansımalar yoktur.**

## Denklemler ve doğruluk aralığı

### 1. Parçacık dinamiği (yarı-klasik elektromanyetizma)

Her parçacığın gerçek kütlesi `m_i`, elektrik yükü `q_i`, konumu `r_i=(x_i,y_i)` ve relativistik momentumu `p_i=γm_iv_i` saklanır:

```text
γ_i = 1 / sqrt(1 - |v_i|² / c²)
v_i = p_i / (m_i sqrt(1 + |p_i|²/(m_i² c²)))

F_i = sum_(j != i) k q_i q_j (r_i-r_j) / (|r_i-r_j|² + a²)^(3/2)
       + q_i (v_i × B_z)
k = 1 / (4π ε₀)
```

Bütün uzaklıklar SI metre, zaman SI saniye cinsinden hesaplanır. 2B düzlem, **3B Coulomb yasasının düzlemsel kesitidir**; 2B elektrostatik Poisson çözümü olduğu iddia edilmez.

İntegratör: elektrik kuvveti için yarım-adım momentum itişleri, arada relativistik manyetik Boris rotasyonu, yeni konumda ikinci elektrik kuvveti itişi. Yakın karşılaşma, yüksek hız ve yüksek siklotron frekansı için **adaptif alt-adım**; kare başına hesap yükü üst sınırla korunur. Adım sınırına ulaşılırsa simülasyonun *fiziksel zamanı* geride kalır; zamanı hesap yapılmamış gibi ileri saymaz.

`a` Coulomb yumuşatma parametresidir (varsayılan 0.20 nm). Bu **denklemi düzenlemek için eklenen sayısal yaklaşım**dır, fundamental fiziksel parçacık boyutu değildir. Çok yakın karşılaşmalar, bağlanmış atom sistemleri ve tünelleme için güvenilmezdir.

Kinetik ve potansiyel enerji:

```text
T = Σ_i (γ_i - 1) m_i c²
U = Σ_(i<j) k q_i q_j / sqrt(|r_i-r_j|² + a²)
E = T + U
```

Tekdüze sabit dış manyetik alan tek başına iş yapmaz. Enerji sapması, en son sahne/parametre/hız değişiminden sonraki toplam enerjiyi karşılaştırır. Büyük sapma, integrasyonun verilen zaman/konum ölçeğinde yeterli olmadığını gösterebilir.

### 2. Dalga görünümü (serbest Gauss Schrödinger paketleri)

Parçacık başına başlangıçta standart sapması `σ₀` olan, **2B normalize serbest paket yoğunluğu**:

```text
σ(t) = σ₀ sqrt(1 + [ħ t/(2 m σ₀²)]²)
ρ_i(r,t) = 1/(2πσ(t)²) exp(-|r-r_i(t)|²/(2σ(t)²))
λ_deBroglie = h / |p|
```

Ekrandaki toplam yoğunluk `Σ_i ρ_i` beklenen parçacık **sayı yoğunluğu** görselleştirmesidir, ayrı parçacık genliklerinin koherent toplamı değildir. Bu nedenle **iki-parçacık girişimi veya antibozon/fermiyon değişim simetrisi hesaplanmıyor**.

Paket **genişlemesi, serbest Schrödinger denkleminin analitik çözümüdür**; paket merkezi ise yukarıdaki etkileşimli klasik denklemlerden alınır. Dolayısıyla etkileşen çok-parçacık Schrödinger denkleminin tam çözümü değildir. Görelilik düzeltmeleri dalga denkleminde yoktur, dolayısıyla özellikle `v ≳ 0.1c` için güvenilir değildir. Yüksek enerjili konum lokalizasyonu ve parçacık üretimi de yoktur.

### 3. Kuantum alanı görünümü (tek-parçacık sektörü)

Seçili parçacık için tek-parçacık nonrelativistik alan genliği

```text
A_s(r,t) = <0| Ψ̂_s(r) |1_ψ>
```

serbest Gauss dalga paketi yaklaşımından elde edilir ve **Re A_s** çizilir. Mavi/mor işaret, kompleks genliğin pozitif/negatif reel parçasını belirtir; doğrudan ölçülebilir olasılık değildir. Fazda `p·(r-r_c)/ħ`, serbest paket chirp'i ve birikimli kinetik faz kullanılır. Etkileşimli harekette **yarı-klasik taşıma** yapıldığı için bu bir tam etkileşimli alan çözümü değildir. Seçili parçacık değiştiğinde gösterilen alan da değişir; her tür için bağımsız bir Hilbert uzayı kurulmaz.

Turuncu oklar ayrı bir **klasik elektrik alanı** `E(r)=Σ_i k q_i (r-r_i) / (|r-r_i|²+a²)^(3/2)` gösterir. Bu, kuantize elektromanyetik alan değildir.

### Fiziksel sınırlar

- **Yok:** foton yayımı/soğurulması, elektromanyetik dalganın retarde yayılımı, parçacıkların birbirinden oluşturduğu manyetik alan, spin, istatistik, dolaşıklık, ölçüm çökmesi, QED döngüleri, anihilasyon veya çift oluşumu.
- **Yok:** güçlü/ zayıf kuvvet, nükleer bağlanma, nötron/müon bozunması, çok-parçacık kuantum saçılması, atom orbitalleri veya kimyasal bağlar.
- **Alfa çekirdeği:** `+2e` yüküne sahip noktasal klasik kompozit olarak temsil edilir; iç nükleer yapı hesaplanmaz.
- **Nötron:** yüklü değildir, bu elektromanyetik modelde serbest hareket eder; gerçek nötronun manyetik dipol momenti hesaba katılmaz.
- **Sınırlar:** yansıtıcı duvar veya periyodik sınır yoktur. Parçacık tuval dışına çıkabilir.
- **Alan:** yalnızca dışarıdan verilen uniform `B_z` ve yüklerin düzenlenmiş *anlık* statik elektrik alanı hesaplanır. Çok yüksek `B` değerleri (±4000 T) fizik açısından uç parametrelerdir; öğrenme ve görselleştirme içindir.
- **Sayısal doğruluk:** enerji sapması ve testler, seçilen yaklaşımın içinde tutarlılık kontrolüdür; eksik fiziği kanıtlamaz.

## Doğrulama

`tests/physics.test.mjs` şu değişmezleri denetler:

- relativistik momentum/hız dönüşümleri ve `|v|<c`;
- zıt yük çekimi ve Newton'un üçüncü yasası;
- nötr parçacığa elektromanyetik kuvvet uygulanmaması;
- serbest dalga paketi genişleme formülü ve 2B olasılık normu;
- dış manyetik alanın enerjiye iş yapmaması;
- elektrostatik alanın düzenlenmiş potansiyelin negatif gradyanına eşitliği;
- kuvvetsiz parçacığın düzgün doğrusal hareketi;
- ayrık iki-parçacık sisteminde yaklaşık enerji korunumu.

## Kaynaklar

- [NIST CODATA 2022 fiziksel sabitler](https://physics.nist.gov/cuu/pdf/all.pdf), özellikle `c`, `h`, `ħ`, `e`, `ε₀`, elektron/proton/müon/nötron kütleleri.
- [NIST 2022 sabitler tablosu](https://physics.nist.gov/cuu/pdf/wall_2022.pdf).
- [Serbest Gauss paketinin analitik genişlemesi](https://marcinplodzien.github.io/quantum-many-body-simulation/ch01_computational_toolbox/00a_free_particle_gaussian_wave_packet.html).

## Mimari

```text
index.html              Sayfa ve erişilebilir kontroller
src/constants.js        SI birim sabitleri ve parçacık veri tabanı
src/physics.js          Denklemler, integratör, enerji ve paket fonksiyonları
src/renderer.js         Canvas 2D parçacık / dalga / alan katmanları
src/app.js              Kontrol olayları, deneyler, simülasyon döngüsü
src/styles.css          Duyarlı arayüz
tests/physics.test.mjs  Fizik invariantları ve analitik kontroller
.github/workflows/ci.yml  Test ve JavaScript sözdizimi kontrolleri
```

Lisans: Henüz belirtilmedi.
