import React from "react";

const Form = props => (
	<form onSubmit={props.getWeather}>
		<input type="text" name="park" placeholder="Baltimore Park"/>
		<button>Go Ball!</button>
	</form>
);

export default Form;
