<template>
	<button type="button" class="btn" :class="{ 'is-active': active }">
		<slot />
	</button>
</template>

<script setup>
defineProps({
	active: { type: Boolean, default: false }
});
</script>

<style scoped>
.btn {
	padding: 10px 16px;
	border: none;
	background: #3366ff;
	color: #ffffff;
	border-radius: 4px;
	cursor: pointer;
}
.btn[data-v-scope]:hover {
	background: #254eda;
}
.btn.is-active {
	box-shadow: 0 0 0 2px #99bbff;
}
</style>
