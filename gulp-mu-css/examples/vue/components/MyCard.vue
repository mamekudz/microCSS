<template>
	<article class="card">
		<h2 class="card-title">{{ title }}</h2>
		<div class="card-body">
			<slot />
		</div>
	</article>
</template>

<script setup>
defineProps({
	title: { type: String, default: "" }
});
</script>

<style scoped lang="less">
@border: #cccccc;

.card {
	border: 1px solid @border;
	border-radius: 8px;
	padding: 12px;
	background: #ffffff;
}
.card :deep(.card-title) {
	font-weight: bold;
	margin: 0 0 8px;
	color: #222222;
}
.card-body {
	color: #444444;
}
</style>
