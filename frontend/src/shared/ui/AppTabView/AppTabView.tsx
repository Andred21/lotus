import { TabView, TabPanel } from 'primereact/tabview'
import type { TabViewProps } from 'primereact/tabview'

export type { TabViewProps as AppTabViewProps } from 'primereact/tabview'

const appTabViewPt = {
  panelContainer: { className: 'p-0' },
}

export function AppTabView({ pt, ...props }: TabViewProps) {
  return <TabView pt={pt ?? appTabViewPt} {...props} />
}

export { TabPanel as AppTabPanel }
