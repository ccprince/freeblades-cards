<script setup lang="ts">
import { RouterView } from "vue-router";
</script>

<template>
  <header>
    <h1>Freeblades Card Extractor</h1>
  </header>
  <RouterView />
  <footer>
    <a href="https://www.dgsgames.com/freeblades-about/" target="_blank" rel="noopener">Freeblades</a>
    &middot;
    <a href="https://www.dgsgames.com/" target="_blank" rel="noopener">DGS Games</a>
  </footer>
</template>

<style scoped>
header {
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--color-border);
}

h1 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

footer {
  padding: 0.75rem 2rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.6;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
</style>
