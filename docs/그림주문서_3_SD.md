# AIU 그림 주문서 3: SD 캐릭터 (3D 모델 변환용)

전투 화면을 SD 3D 캐릭터로 바꾸기 위한 그림이에요. 받은 그림은 이 순서로 써요.
1. AI 3D 변환(Tripo 또는 Meshy)으로 SD 그림을 3D 모델로 바꿔요.
2. Mixamo(무료)에서 뼈대를 자동으로 심고, 서 있기, 걷기, 공격, 피격 동작을 붙여요.
3. 게임 안에서 Three.js로 돌려요.

카드, 뽑기 배너, 시작 화면 같은 일러스트는 지금 그림을 그대로 써요. 바뀌는 건 전투 화면의 캐릭터뿐이에요.

## 먼저 램파트 한 명만
1. 램파트 세 장(정면, 옆, 뒤)과 방패 한 장을 먼저 받아 주세요.
2. 제가 3D 변환부터 게임 안에서 움직이는 것까지 시험해 보고, 결과를 보여 드릴게요.
3. 괜찮으면 나머지 네 명을 같은 방식으로 진행해요.
처음부터 20장을 다 받았다가 방식이 안 맞으면 다시 그려야 하니까요.

## 쓰는 법
1. 회색 칸 하나가 그림 한 장이에요.
2. **정면** 칸은 그 요원의 **B 전신 그림**(예전에 받은 회색 배경 전신)을 붙여서 보내요.
3. **옆, 뒤** 칸은 **같은 대화에서** 이어서 보내요. 붙일 그림은 방금 받은 SD 정면 그림이에요.
4. **무기** 칸은 새 대화에서, 그 요원의 B 전신 그림을 붙여서 보내요.

## 3D 변환이 잘 되는 그림의 조건 (칸 안에 이미 들어 있어요)
- 팔을 몸에서 살짝 벌린 A자세예요. 팔이 몸에 붙으면 3D에서 한 덩어리로 붙어 버려요.
- 손은 비워요. 무기를 들고 있으면 손과 무기가 붙어서 뼈대가 엉켜요. 그래서 무기는 따로 그려서 나중에 손에 붙여요.
- 코트는 펄럭이지 않고 곧게 내려와야 해요.
- 조명은 고르게 하고, 강한 그림자나 빛 테두리, 빛 효과는 넣지 않아요. 3D 표면 색으로 그대로 들어가기 때문이에요.
- 정면, 옆, 뒤가 같은 크기와 비율이어야 해요.

## 말을 안 들을 때
- 팔이 몸에 붙으면: `Both arms must be held clearly away from the body in an A-pose, about 30 degrees out. Redraw.`
- 손에 무언가를 들면: `Both hands must be empty and open. No item in the hands. Redraw.`
- 옆, 뒤 그림의 비율이 달라지면: `Exactly the same character, proportions and size as the attached front view. Redraw.`
- 그림자나 빛 효과가 강하면: `Flat even lighting, no strong shadows, no rim light, no glow. Redraw.`
- 배경이 생기면: `The background must be ONE flat plain light grey color only. No floor, no shadow. Redraw.`

---

## 공통 정면 칸 (요원마다 [ ] 안만 바꿔서)

```
Draw the SAME character as the attached image (same face, hair color, hairstyle, outfit colors and details) as a cute chibi SD game character for 3D modeling reference. Proportions: super-deformed, about 2.5 heads tall, large head, small body, short limbs. FRONT view: facing the viewer directly and symmetrically, standing straight in an A-pose with both arms held about 30 degrees away from the body, hands open and EMPTY, legs slightly apart, feet flat on the ground. [OUTFIT NOTE] Clean anime cel shading with simple clear shapes, flat even lighting, no strong shadows, no rim light, no glow, no effects. Background: ONE flat plain light grey color only. No floor, no shadow. The whole body visible with empty space around it. Square 1:1, no border. The only text allowed is exactly "AIU" on a small shoulder patch.
```

## 공통 옆 칸 (정면 다음, 같은 대화에서)
```
Draw the EXACT same chibi SD character as the attached front view (same proportions, size, outfit and colors) seen from the LEFT side in a full profile view, facing left, same A-pose with the arm held away from the body, hands empty. Same flat even lighting, no shadows, no effects. Background: ONE flat plain light grey color only. No floor, no shadow. Square 1:1, no border. The only text allowed is exactly "AIU" on a small shoulder patch.
```

## 공통 뒤 칸 (같은 대화에서)
```
Draw the EXACT same chibi SD character as the attached front view (same proportions, size, outfit and colors) seen from directly BEHIND, back view, same A-pose with both arms held away from the body, hands empty. Same flat even lighting, no shadows, no effects. Background: ONE flat plain light grey color only. No floor, no shadow. Square 1:1, no border. No text.
```

---

## 요원별 [OUTFIT NOTE]와 무기 칸

### 1. 램파트 (`knight`) → `knight_sd_front.png`, `knight_sd_side.png`, `knight_sd_back.png`
[OUTFIT NOTE] 자리에:
```
Very short buzz cut, small scar on the chin, dark navy tactical vest over a black uniform, black gloves and combat boots.
```
**무기** → `knight_prop.png`
```
Draw ONLY the item that the character in the attached image is holding, as a single game prop for 3D modeling reference: a tall black riot shield with a small viewing window and a thin violet glowing strip along its edge, in a chibi game art style with simple clear shapes. Front view, standing upright, centered. Flat even lighting, no shadows. Background: ONE flat plain light grey color only. No hands, no character. Square 1:1, no text.
```

### 2. 롱샷 (`archer`) → `archer_sd_front.png`, `archer_sd_side.png`, `archer_sd_back.png`
[OUTFIT NOTE] 자리에:
```
Silver-ash short bob hair, dark green hooded raincoat worn closed and hanging straight, grey vest underneath, black gloves and combat boots.
```
**무기** → `archer_prop.png`
```
Draw ONLY the long item that the character in the attached image is holding, as a single game prop for 3D modeling reference, in a chibi game art style with simple clear shapes: the same long dark scoped tool with a small violet glowing lens, seen from the side, lying horizontally, centered. Flat even lighting, no shadows. Background: ONE flat plain light grey color only. No hands, no character. Landscape 3:2, no text.
```

### 3. 블레이즈 (`mage`) → `mage_sd_front.png`, `mage_sd_side.png`, `mage_sd_back.png`
[OUTFIT NOTE] 자리에:
```
Messy red hair, small scar on the cheek, cocky grin, dark brown leather long coat worn closed and hanging straight, belt with small orange canisters, fingerless gloves and combat boots.
```
**무기** → `mage_prop.png`
```
Draw ONLY a small glass bottle with an orange label and a cloth stopper, as a single game prop for 3D modeling reference, in a chibi game art style with simple clear shapes. Standing upright, centered. No fire. Flat even lighting, no shadows. Background: ONE flat plain light grey color only. No hands, no character. Square 1:1, no text.
```

### 4. 헤일로 (`priest`) → `priest_sd_front.png`, `priest_sd_side.png`, `priest_sd_back.png`
[OUTFIT NOTE] 자리에:
```
Long black hair tied in a low ponytail, white raincoat worn closed and hanging straight, red cross armband, medical shoulder bag at the hip, black gloves and combat boots.
```
**무기** → `priest_prop.png`
```
Draw ONLY the hand lantern that the character in the attached image is holding, as a single game prop for 3D modeling reference, in a chibi game art style with simple clear shapes: an old metal hand lantern with a warm glowing glass center. Standing upright, centered. Flat even lighting. Background: ONE flat plain light grey color only. No hands, no character. Square 1:1, no text.
```

### 5. 나이트폴 (`dark`) → `dark_sd_front.png`, `dark_sd_side.png`, `dark_sd_back.png`
[OUTFIT NOTE] 자리에:
```
Black messy hair with bangs covering one eye, one glowing amber eye visible, black suit with a violet tie, long black coat worn closed and hanging straight, black gloves and dress shoes.
```
**무기** → `dark_prop.png`
```
Draw ONLY the long blade that the character in the attached image is holding, as a single game prop for 3D modeling reference, in a chibi game art style with simple clear shapes: a slim curved single-edged blade with a dark wrapped handle and a softly glowing violet edge. Lying horizontally, centered. Flat even lighting, no shadows. Background: ONE flat plain light grey color only. No hands, no character. Landscape 3:2, no text.
```

---

## 받은 뒤 (제가 하는 일)
1. 3D 변환: Tripo나 Meshy에 정면, 옆, 뒤 세 장을 넣어 3D 모델로 바꿔요. 가입이 필요한 사이트라, 로그인만 해 주시면 브라우저로 제가 진행할 수 있어요.
2. 뼈대와 동작: Mixamo(Adobe 계정)에서 자동으로 뼈대를 심고 동작을 붙여요.
   - 서 있기
   - 걷기
   - 요원별 공격(방패 밀치기, 사격, 던지기, 들어 올리기, 베기)
   - 맞기
   - 쓰러짐
3. 손질: 컴퓨터의 블렌더로 무기를 손에 붙이고, 툰 느낌으로 색을 맞추고, 용량을 줄여요.
4. 게임 적용: 전투 화면에서 3D 캐릭터가 움직이게 바꿔요. 이상체와 근원체는 지금 그림을 그대로 써요.
