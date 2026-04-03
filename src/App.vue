<script setup lang="ts">
import { RouterView } from "vue-router";
</script>

<template>
  <header>
    <h1>Freeblades Card Extractor</h1>
  </header>
  <RouterView />
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
</style>
