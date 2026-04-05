
  # Cyberpunk System Monitor Design

  This is a code bundle for Cyberpunk System Monitor Design. The original project is available at https://www.figma.com/design/nRZLKtcMyJNprCSQulDkRo/Cyberpunk-System-Monitor-Design.

  ## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start both the Vite client and the local metrics API (Express + systeminformation).

The dashboard now streams live CPU / RAM / GPU / disk stats from your Windows machine via `http://localhost:8787/api/stats`. Keep the terminal open so the API keeps running.
  
