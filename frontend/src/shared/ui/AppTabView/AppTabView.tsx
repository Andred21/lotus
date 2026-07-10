import { TabView, TabPanel } from 'primereact/tabview'
import type { TabViewProps } from 'primereact/tabview'

export type { TabViewProps as AppTabViewProps } from 'primereact/tabview'

export function AppTabView(props: TabViewProps) {
  return <TabView {...props} />
}

export { TabPanel as AppTabPanel }
