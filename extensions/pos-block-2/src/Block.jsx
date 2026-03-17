import "@shopify/ui-extensions/preact";
import {render} from 'preact';

export default async () => {
  render(<Extension />, document.body);
};

export function Extension() {
  const {i18n} = shopify;
  
  return (
    <s-pos-block heading={i18n.translate('block_heading')}>
      <s-button
        slot="secondary-actions"
        onClick={() => shopify.action.presentModal()}
      >
        {i18n.translate('open_action')}
      </s-button>
      <s-box padding="large">
        <s-text>{i18n.translate('block_content')}</s-text>
      </s-box>
    </s-pos-block>
  );
}