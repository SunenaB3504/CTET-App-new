import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Modal from '../../components/Modal'

describe('Modal component', ()=>{
  it('focuses first focusable element and closes on Escape', async ()=>{
    const onClose = vi.fn()
    render(
      <Modal onClose={onClose} ariaLabel="Test Dialog">
        <div>
          <button>First</button>
          <button>Second</button>
        </div>
      </Modal>
    )

    const first = screen.getByText('First') as HTMLButtonElement
    await waitFor(() => expect(document.activeElement).toBe(first))

  // dispatch Escape
  fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
