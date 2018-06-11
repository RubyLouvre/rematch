import * as Redux from 'redux'
import * as R from './typings'
import isListener from './utils/isListener'

const composeEnhancersWithDevtools = (devtoolOptions = {}): any =>
	/* istanbul ignore next */
	typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
		? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__(devtoolOptions)
		: Redux.compose

export default function({
	redux,
	models,
}: {
	redux: R.ConfigRedux,
	models: R.Model[],
}) {
	const combineReducers = redux.combineReducers || Redux.combineReducers
	const createStore: Redux.StoreCreator = redux.createStore || Redux.createStore
	const initialState: any =
		typeof redux.initialState !== 'undefined' ? redux.initialState : {}

	this.reducers = redux.reducers

	// combine models to generate reducers
	this.mergeReducers = (nextReducers: R.ModelReducers = {}) => {
		// merge new reducers with existing reducers
		this.reducers = { ...this.reducers, ...nextReducers }
		if (isEmptyObject(this.reducers)) {
			// no reducers, just return state
			return (state: any) => state
		}
		return combineReducers(this.reducers)
	}

	this.createModelReducer = (model: R.Model) => {
		const modelReducers = {}
		for (const modelReducer of Object.keys(model.reducers || {})) {
			const action = isListener(modelReducer)
				? modelReducer
				: `${model.name}/${modelReducer}`
			modelReducers[action] = model.reducers[modelReducer]
		}
		this.reducers[model.name] = (
			state: any = model.state,
			action: R.Action
		) => {
			// handle effects
			if (typeof modelReducers[action.type] === 'function') {
				return modelReducers[action.type](state, action.payload, action.meta)
			}
			return state
		}
	}
	// initialize model reducers
	for (const model of models) {
		this.createModelReducer(model)
	}

	this.createRootReducer = (
		rootReducers: R.RootReducers = {}
	): Redux.Reducer<any, R.Action> => {
		const mergedReducers: Redux.Reducer<any> = this.mergeReducers()
		if (!isEmptyObject(rootReducers)) {
			return (state, action) => {
				const rootReducerAction = rootReducers[action.type]
				if (rootReducers[action.type]) {
					return mergedReducers(rootReducerAction(state, action), action)
				}
				return mergedReducers(state, action)
			}
		}
		return mergedReducers
	}

	const rootReducer = this.createRootReducer(redux.rootReducers)

	const middlewares = Redux.applyMiddleware(...redux.middlewares)
	const enhancers = composeEnhancersWithDevtools(redux.devtoolOptions)(
		...redux.enhancers,
		middlewares
	)

	this.store = createStore(rootReducer, initialState, enhancers)

	return this
}
function isEmptyObject(obj: Object) : boolean{
    for(var i in obj){
        return false;
    }
    return true;
}
