# 🧠 Interactive 3D Human Anatomy Explorer

An interactive, web-based 3D anatomy visualization tool that allows users to explore the human body layer-by-layer with smooth navigation, smart labeling, and internal structure visualization.

---

## 🚀 Overview

Understanding human anatomy is often limited by static diagrams and memorization-heavy approaches. This project transforms raw anatomical models into an **interactive learning experience**, enabling users to explore different body systems dynamically.

---

## ✨ Features

- 🧩 **Layer-Based Exploration**
  - Toggle between muscle, organs, blood vessels, nerves, and skeleton

- 🔍 **Smooth Zoom Navigation**
  - Trackpad-friendly zoom with natural camera movement

- 🎯 **Click-to-Focus Interaction**
  - Click on any part to focus and explore it closely

- ✂️ **Clipping-Based Internal View**
  - Cleanly reveals inner anatomy without transparency artifacts

- 🏷️ **Smart Labeling System**
  - Displays only relevant labels based on visible system
  - Prevents clutter and improves learning clarity

- 📊 **Information Panel**
  - Provides contextual details for selected anatomical parts

---

## 🧠 Motivation

Most existing anatomy tools:
- Are either **paid or restricted**
- Have **complex interfaces**
- Or are simply **basic 3D viewers without learning support**

This project aims to provide a **simple, intuitive, and accessible** alternative focused on **learning and interaction**.

---

## 🧾 Data Source

- Anatomical models sourced from **Z-Anatomy**
- Original downloaded models were:
  - Uncolored  
  - Lacking labels  

### Enhancements Made:
- 🎨 Added color differentiation for clarity
- 🧩 Structured into anatomical systems
- 🏷️ Mapped labels with descriptions
- ⚙️ Integrated into interactive 3D environment

---

## 🛠️ Tech Stack

- **Three.js** – 3D rendering
- **GLTF Loader** – Model loading
- **OrbitControls** – Camera interaction
- **CSS2DRenderer** – Label rendering
- **JavaScript (ES6)** – Application logic

---

## ⚙️ How It Works

1. Models are loaded as separate anatomical layers  
2. Camera controls enable smooth navigation  
3. Clipping planes simulate internal slicing  
4. Smart logic determines which labels to display  
5. UI toggles control system visibility  

---

## 📦 Project Structure

```
project-root/
│   ├── js
│   │   ├── controls
│   │   │   └── OrbitControls.js
│   │   ├── loaders
│   │   │   └── GLTFLoader.js
│   │   ├── renderers
│   │   │   └── CSS2DRenderer.js
│   │   ├── utils
│   │   │   └── BufferGeometryUtils.js
│   │   ├── clipping.js
│   │   ├── events.js
│   │   ├── modelLoader.js
│   │   ├── sceneSetup.js
│   │   └──three.module.js
│   ├── models
│   │   ├── blood.glb
│   │   ├── muscle.glb
│   │   ├── nerves.glb
│   │   ├── organs.glb
│   │   └── skeleton.glb
│   ├── index.html
│   ├── main.js
│   └── style.css
```

---

## ▶️ Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/your-username/anatomy-explorer.git
cd anatomy-explorer
```
### 2. Run locally
```bash
serve .
```
### 3. Open in browser
```
http://localhost:<PORT_NO>
```
## 🎯 Use Cases

- 📚 Medical & school education  
- 🧑‍🏫 Classroom demonstrations  
- 🧠 Self-learning and revision  
- 💻 EdTech platform integration  

---

## ⚠️ Limitations

- Uses external anatomical models  
- Limited number of labeled structures  
- Not optimized for mobile devices yet  

---

## 🔮 Future Improvements

- 📱 Mobile responsiveness  
- 🥽 AR/VR integration  
- 🧪 Interactive quizzes  
- 🧠 AI-guided exploration  
- 🩺 More detailed organ systems  

---

## 🤝 Contributing

Contributions are welcome. Feel free to open issues or submit pull requests.


